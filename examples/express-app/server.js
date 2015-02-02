var express = require('express'),
  envprops = require('../../'),
  props = envprops.get('app'),
  app = express();

// set app properties
props.setMany(require('./properties.json'));

// begin routing
app.use(require('./resources/app'));

app.listen(props.get('port'), function () {
  console.log('on :%d', props.get('port'));
});
