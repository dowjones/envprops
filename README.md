# envprops [![Build Status](https://secure.travis-ci.org/areusjs/envprops.png)](http://travis-ci.org/areusjs/envprops) [![NPM version](https://badge.fury.io/js/envprops.svg)](http://badge.fury.io/js/envprops)

The purpose of this library is to store and retrieve
environment-specific configuration.

The main distinguishing feature is the way one sets the
properties. In many other libraries you provide environments,
which contain keys that in turn contain values:

```javascript
{
  development: {
    a: 'v1',
    b: 'v2'
  },
  production: {
    a: 'v3',
    b: 'v4'
  }
}
```

The problem we've often seen is that people set a key in one environment, but not
in the other. This is especially true when the number of keys is large, and thus one
key is visually distant from the same key in another environment.

To remedy this, `envprops` takes a different approach. The key goes first,
then multiple environments, with values for each:

```javascript
{
  a: {
    development: 'v1',
    production: 'v2'
  },
  b: {
    development: 'v3',
    production: 'v4'
  }
}
```

As there are fewer environments than keys, it is harder to make the mistake of
forgetting an environment than it is of forgetting a key.


## Usage:

```javascript
var envprops = require('envprops'),
  props = envprops.get('users:service'); // namespace

// params: key: {env1: value1, env2: value2}
props.setMany({
  serviceVersion: {
    'development,staging': '1.0.0',
    'production': '2.0.0',
    'production.*.az1': '4.0.0'
  }
});

// params: env, key, value
props.set('production.dc1', 'serviceVersion', '3.0.0');

// NODE_ENV = 'staging'  or  NODE_ENV = 'development'
props.get('serviceVersion'); // 1.0.0

// NODE_ENV = 'production.dc1'
props.get('serviceVersion'); // 3.0.0

// NODE_ENV = 'production.dc2'
props.get('serviceVersion'); // 2.0.0

// NODE_ENV = 'production.dc1.az1'
props.get('serviceVersion'); // 4.0.0

// NODE_ENV = 'production.dc2.az1'
props.get('serviceVersion'); // 4.0.0
```

## Using environment variables as the value

```javascript
props.set('production', 'key', '$ENV:MY_KEY');
```

## Using an external file:

```javascript
var envprops = require('envprops'),
  props = envprops.get('users:service');

props.setMany(require('./config.json'));

props.get('key'); // value
```

## Using local properties

To get properties that will not be kept in memory,
simply use `create` instead of `get` and don't provide a namespace:

```javascript
var globalProps = property.create();
globalProps.get('key'); // <value>
```

## Setting a default value:

Use the `all` environment key to set a value
for all environments:

```javascript
{
  "key": {
    "development": "v1",
    "all": "v2"
  }
}
```

## Configuring multiple environment at once

This can be done by providing comma-separated
list of environments:

```javascript
{
  "key": {
    "development,staging": 1,
    "production": 2
  }
}
```

## Environment segments and globs

Another feature that is supported by this library is environment
segments. Segmenting the environment may be useful if multiple
keys make up an environment (e.g., region and data-center).
Here's an example:

```javascript
{
  "key": {
    "prod.dc1.eu": "v2",
    "prod.*.eu": "v3"
  }
}
```

`NODE_ENV = prod.dc1.eu`
```javascript
props.get('key'); // 'v2'
```

`NODE_ENV = prod.dc7.eu`
```javascript
props.get('key'); // 'v3'
```

## Provide your own environment
```javascript
var envprops = require('envprops'),
  props = envprops('production');
```


## Contributors:

- Yuriy Nemtsov
- Lee Cookson
- Dominique Boucher
- Hrusikesh Panda
- Doug Reiter
- Christopher Montgomery
- Robert DiNicolas

## License

[MIT](/LICENSE)
