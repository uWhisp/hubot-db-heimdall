process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';
var config = require('config');

var package = require('./package.json');

var defaultConfig = {
  Strings: {
    sorry_dave: 'I\'m sorry %s, I\'m afraid I can\'t do that.'
  },
};

config.util.setModuleDefaults(package.name, defaultConfig);

// TODO: check required config items
