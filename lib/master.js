'use strict';

var cluster = require('cluster'),
    events  = require('events'),
    util    = require('util'),
    _       = require('lodash')


var formatExitMessage = function(worker, code, signal) {
  var m = 'Worker died (pid: ' + worker.process.pid + ', suicide: ' +
              (worker.suicide === undefined ? 'false' : worker.suicide.toString());
  if (worker.suicide === false) {
    if (code !== null) {
      m += ', exitcode: ' + code;
    }

    if (signal !== null) {
      m += ', signal: ' + signal;
    }
  }

  m += '). Spawning a new one.';
  return m
}



function Master(config) {
  if (!(this instanceof Master)) {
    return new Master(config);
  }

  this.logger = config.logger
  this.logger.info('Server is running. ' + JSON.stringify(config.server));

  this.spawnWorkers(config.server.workers);
}


Master.prototype = new events.EventEmitter();


Master.prototype.spawnWorkers = function (number) {
  var self = this

  var spawnWorker = function () {
    var worker = cluster.fork();

    worker.on('message', function (message) {
      self.logger.info(message)
    });
  };

  // Spawn all workers
  _.times(number, function(n) {
    self.logger.info('Spawning worker #' + n);
    spawnWorker();
  })


  // When one worker is dead, let's respawn one
  cluster.on('exit', function (worker, code, signal) {
    self.logger.warn(formatExitMessage(worker, code, signal))
    spawnWorker();
  });

  // Set an exit handler
  var onExit = function () {
    this.emit('exit');
    self.logger.warn('Exiting, killing the workers');

    _.each(cluster.workers, function(worker) {
      self.logger.warn('Killing worker #' + worker.process.pid);
      worker.destroy();
    })

    process.exit(0);
  }.bind(this);

  process.on('SIGINT', onExit);
  process.on('SIGTERM', onExit);
};

module.exports = Master;
