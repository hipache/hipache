'use strict';

var fs    = require('fs'),
    path  = require('path'),
    util  = require('util'),
    cluster = require('cluster'),
    events  = require('events')

var master = require('../lib/master'),
    worker = require('../lib/worker')


function Hipache() {
  if (!(this instanceof Hipache)) {
    return new Hipache();
  }
}

Hipache.prototype = new events.EventEmitter();

Hipache.prototype.run = function(path) {
  var config = this.readConfig(path)

  if (cluster.isMaster) {
    master(config);
    util.log('Server is running. ' + JSON.stringify(config.server));
  } else {
    worker(config);
  }
}

Hipache.prototype.readConfig = function(path) {
  var data    = fs.readFileSync(path),
      config  = JSON.parse(data);

  util.log('Loading config from ' + path);

  return config
}

module.exports = Hipache
