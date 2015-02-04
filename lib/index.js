var NODE_ENV = process.env.NODE_ENV || 'development', 
  ENV_VAR_RE = /^\$ENV:(.+)/,
  globalService; // instantiated at the bottom

module.exports = PropertyService;

/**
 * Property Service
 *
 * The purpose of this service is to provide a place
 * to store environment-specific configuration.
 *
 * Usage:
 *     properties = propertyService.getProperties('my.namespace')
 *
 *     properties.setMany({
 *       serviceVersion: {
 *         'development,staging': '1.0.0',
 *         'production': '2.0.0',
 *         'production.dc1': '3.0.0',
 *         'production.*.az1': '4.0.0'
 *       }
 *     })
 *
 *     // NODE_ENV = 'staging'  or  NODE_ENV = 'development'
 *     properties.get('serviceVersion') // 1.0.0
 *
 *     // NODE_ENV = 'production.dc1'
 *     properties.get('serviceVersion') // 3.0.0
 *
 *     // NODE_ENV = 'production.dc2'
 *     properties.get('serviceVersion') // 2.0.0
 *
 *     // NODE_ENV = 'production.dc1.az1'
 *     properties.get('serviceVersion') // 4.0.0
 */

function PropertyService(environment) {
  if (!(this instanceof PropertyService)) {
    return new PropertyService(environment);
  }
  environment = environment || NODE_ENV;
  this._env2rank = this._calculateRanks(environment);
  this._coreKey2rank = {};
  this._cache = {};
}

PropertyService.$inject = [
  'internal.environment'
];

PropertyService.get = function (namespace) {
  return globalService.get(namespace);
};

PropertyService.create = function () {
  return globalService.create('');
};

PropertyService.prototype.get = function (namespace) {
  return this.getProperties(namespace, {scope: 'singleton'});
};

PropertyService.prototype.create = function (namespace) {
  return this.getProperties(namespace);
};

/**
 * @deprecated use PropertyService#get or PropertyService#create instead
 */

PropertyService.prototype.getProperties = function (namespace, options) {
  var cache, key2rank;
  options = options || {};
  switch (options.scope) {
    case 'singleton':
      key2rank = this._coreKey2rank;
      cache = this._cache;
      break;
    default:
      key2rank = {};
      cache = {};
      break;
  }
  return new Properties(this._env2rank, namespace, key2rank, cache);
};

function Properties(env2rank, namespace, key2rank, cache) {
  this._env2rank = env2rank;
  this.namespace = namespace;
  this._key2rank = key2rank;
  this._cache = cache;
}

/**
 * Set a property.
 *
 * @param {String} env environment
 * @param {String} key
 * @param {String|Number|Boolean|Object} value
 */

Properties.prototype.set = function (env, key, value) {
  var rank = this._env2rank[env.trim()],
    propKey, highest, match;

  // don't set any keys for other environments
  if ('undefined' === typeof rank) return;

  propKey = (this.namespace + ':' + key);
  highest = (this._key2rank[propKey] || -1);

  if (rank < highest) return;
  this._key2rank[propKey] = rank;

  // check if the value is an environment variable
  if ('string' === typeof value) {
    match = value.match(ENV_VAR_RE);
    value = match ? process.env[match[1]] : value;
  }

  // Override with propery in ENV if available. The env arg is meanless since
  // you only have one active env so why worry and set it for all values
  this._cache[propKey] = value;
};

/**
 * Set many properties at once.
 *
 * Example:
 *
 *     this.properties.setMany({
 *       transport: 'Console',
 *       filename: {
 *         'test,development,local': undefined,
 *         'fdev,sat,prod': '/var/log/tesla'
 *       },
 *       level: {
 *         'test': 'error',
 *         'development,local': undefined,
 *          fdev': 'warn',
 *          'sat,prod': 'error'
 *       }
 *     });
 *
 * @param {Object} properties
 */

Properties.prototype.setMany = function (properties) {
  var trimRegExp = this._trimRegExp,
    hasOwn = Object.hasOwnProperty;

  for (var name in properties) {
    if (!hasOwn.call(properties, name)) continue;
    var property = properties[name];

    if ('object' !== typeof property ||
      Array.isArray(property)) {
      this.set('all', name, property);
      continue;
    }

    for (var envNames in property) {
      if (!hasOwn.call(property, envNames)) continue;
      var value = property[envNames],
        envs = envNames.split(',');

      for (var i = 0, l = envs.length; i < l; i++) {
        this.set(envs[i], name, value);
      }
    }
  }
};

/**
 * Retrieve a property.
 *
 * @param {String} key
 * @param {String|Number|Boolean|Object} defaultValue (optional)
 */

Properties.prototype.get = function (key, defaultValue) {
  var propKey = (this.namespace + ':' + key),
    prop = this._cache[propKey];
  return ('undefined' !== typeof prop) ? prop :
    ('undefined' !== typeof defaultValue) ? defaultValue :
    null;
};

/**
 * Pre-calculate the environments to allow environment segments
 * and set-up rank to establish their precedence.
 */

PropertyService.prototype._calculateRanks = function (environment) {
  var env2rank = {},
    segments = environment.split('.'),
    weight = 1;

  function modify(key) {
    var r = env2rank[key];
    if (r > 0 && r < weight / 2) {
      var s = key;
      while (r < weight / 2) {
        s += '.*';
        r *= 2;
      }
      env2rank[s + '.' + segments[i]] = weight + r;
    } else {
      env2rank[key + '.' + segments[i]] = weight + r;
      env2rank[key + segments[i]] = weight + r;
    }
  }

  for (var i = 0, l = segments.length; i < l; i++) {
    Object.keys(env2rank).forEach(modify);

    if (i === 0) env2rank[segments[i]] = weight;
    weight *= 2; //higher than all previous combinations
  }

  env2rank.all = 0;
  return env2rank;
};

// creating a global service
globalService = new PropertyService();
