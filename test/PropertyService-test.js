var should = require('should'),
  PropertyService = require('../lib/PropertyService');

describe('PropertyService', function () {
  var svc, envFake;

  beforeEach(function () {
    envFake = 'local';
    svc = new PropertyService(envFake);
  });

  describe('scope', function () {
    it('should create properties in the prototype scope by default', function () {
      var p1 = svc.create('nsp');
      p1.set('local', 'n1', 'v1');
      p1.get('n1').should.equal('v1');

      var p1a = svc.create('nsp');
      should.not.exist(p1a.get('n1'));
    });

    it('should support the singleton scope if requested', function () {
      var p1 = svc.get('nsp');
      p1.set('local', 'n1', 'v1');
      p1.get('n1').should.equal('v1');

      var p1a = svc.get('nsp');
      p1a.get('n1').should.equal('v1');
    });
  });

  it('should get a default value if a key is undefined', function () {
    var p1 = svc.create('n');
    p1.get('unknownKey', 'defaultKey').should.equal('defaultKey');
  });

  it('should get different values for the same ' +
    'key in different environments', function () {
    var svc1 = new PropertyService('stag');
    var svc2 = new PropertyService('prod');

    var props1 = svc1.create('nsp');
    props1.set('stag', 'n1', 'vstag');
    props1.set('prod', 'n1', 'vprod');

    var props2 = svc2.create('nsp');
    props2.set('stag', 'n1', 'vstag');
    props2.set('prod', 'n1', 'vprod');

    props1.get('n1').should.equal('vstag');
    props2.get('n1').should.equal('vprod');
  });

  it('should allow environment variables to be used', function () {
    var svc = new PropertyService('prod');
    var props = svc.create('nsp');

    process.env.testit = 'WOW';
    props.set('prod', 'n1', '$ENV:testit');
    props.get('n1').should.equal("WOW");
  });

  it('should support raw value to imply "all" environments', function () {
    ['env1', 'env2', 'env3'].forEach(function (env) {
      var prop = new PropertyService(env).create('nsp');
      prop.setMany({prop: 77, propArr: ['a', 'b']});
      prop.get('prop').should.equal(77);
      prop.get('propArr').should.eql(['a', 'b']);
    });
  });

  describe('setMany', function () {
    it('should be able to set may properties at the same time ' +
      'and handle arbitrary spaces in the environments', function () {
      var PROPS = {
        prop1: {
          'env1': 'v11',
          'env2,env3  ,  env4  ': 'v12'
        },
        prop2: {
          'env1': 'v21',
          'env2': 'v22'
        }
      };
      var TESTS = {env1: 'v11', env2: 'v12', env3: 'v12', env4: 'v12'};
      Object.keys(TESTS).forEach(function (env) {
        var expectEqual = TESTS[env]
          , svc = new PropertyService(env)
          , props = svc.create('nsp');
        props.setMany(PROPS);
        props.get('prop1').should.equal(expectEqual);
      });
    });

    it('should not fail on empty properties', function () {
      var props = svc.create('nsp');
      props.setMany({});
    });

    it('should support defaulting to first parent segment of env', function () {
      var PROPS = {p1: {'prod': 'v1'}},
        ENVS = ['prod.dc1', 'prod.dc2', 'prod.dc2.az1'];

      ENVS.forEach(function (env) {
        var svc = new PropertyService(env),
          props = svc.create('nsp');
        props.setMany(PROPS);
        props.get('p1').should.equal('v1');
      });

      var svc = new PropertyService('blahEnv'),
        props = svc.create('nsp');
      props.setMany(PROPS);
      (null === props.get('p1')).should.be.ok;
    });

    it('should support sub-envs in singleton scope', function () {
      var svc, p1, p2, p3;

      // set the prop1 property in the singleton scope
      svc = new PropertyService('env.dc1');
      p1 = svc.get('nsp');
      p1.setMany({prop1: {'env': 'v1'}});

      // check prop1 can be retrieved from a different property in singleton
      p2 = svc.get('nsp');
      p2.get('prop1').should.equal('v1');

      // re-create cache, starting fresh; prop1 should not exist
      svc = new PropertyService('env.dc1');
      p3 = svc.get('nsp');
      (null === p3.get('prop1')).should.be.ok;
    });
  });

  it('should prefer direct match over a sub-env', function () {
    var PROPS = {
      p1: {
        env: 'v1',
        'env.dc1': 'v2',
        'env.dc1.az1': 'v3',
        'env.*.az2': 'v4'
      }
    };
    var TESTS = {
      env: 'v1',
      'env.dc2': 'v1',
      'env.dc1': 'v2',
      'env.dc1.az1': 'v3',
      'env.dc1.az2': 'v4',
      'env.dc3.az2': 'v4'
    };
    Object.keys(TESTS).forEach(function (env) {
      var expectedValue = TESTS[env],
        svc = new PropertyService(env),
        props = svc.create('nsp');
      props.setMany(PROPS);
      props.get('p1').should.equal(expectedValue);
    });
  });

  it('should not set a less-specific env param if more-specific is set', function () {
    var svc = new PropertyService('prod.dc1.az1'),
      prop = svc.create('n');
    prop.set('prod.dc1', 'k', 'v1');
    prop.set('prod', 'k', 'v2');
    prop.get('k').should.equal('v1');
  });

  it('should support legacy environment vars (for transition to sub-env)', function () {
    var prop = new PropertyService('proddc1').create('nsp'),
      prop2 = new PropertyService('prod.dc1').create('nsp'),
      DEF = {key: {'proddc1': 'v1'}};
    prop.setMany(DEF);
    prop2.setMany(DEF);
    should.equal(prop.get('key'), prop2.get('key'));
  });
});
