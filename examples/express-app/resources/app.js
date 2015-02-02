var express = require('express'),
  props = require('../../../').get('app'),
  router = module.exports = express.Router();

router.get('/', function (req, res, next) {
  res.json({
    name: props.get('name')
  });
});
