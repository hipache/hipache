'use strict';

var readInstalled = require('read-installed'),
    fs    = require('fs')

function Versions() {
  var versions = {};
  var rootDir = fs.realpathSync(__dirname + '/../');

  readInstalled(rootDir, null, null, function(err, data) {
    versions[data.name] = data.version;
  });

  return versions;
}

module.exports = (function() { return Versions })
