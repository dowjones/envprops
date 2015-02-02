var PropertyService = require('./PropertyService'),
  env = process.env.NODE_ENV || 'development',
  globalPropertyService = new PropertyService(env);

exports.get = get;
exports.create = create;
exports.PropertyService = PropertyService;

function get(namespace) {
  return globalPropertyService.get(namespace);
}

function create() {
  return globalPropertyService.create('');
}
