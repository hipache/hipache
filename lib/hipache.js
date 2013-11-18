'use strict';

var fs    = require('fs'),
    path  = require('path'),
    util  = require('util'),
    cluster = require('cluster'),
    events  = require('events'),
    winston = require('winston')

var master = require('../lib/master'),
    worker = require('../lib/worker')

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({timestamp: true, colorize: true})
  ]
});

function Hipache() {
  if (!(this instanceof Hipache)) {
    return new Hipache();
  }
}

Hipache.prototype = new events.EventEmitter();

Hipache.prototype.run = function(path) {
  var config = this.readConfig(path)

  logger.add(winston.transports.File, {timestamp: true, filename: config.server.accessLog })

  config.logger = logger

  if (cluster.isMaster) {
    master(config);
  } else {
    worker(config);
  }
}

Hipache.prototype.readConfig = function(path) {
  var data    = fs.readFileSync(path),
      config  = JSON.parse(data);

  logger.info('Loading config from ' + path);

  return config
}

module.exports = Hipache


