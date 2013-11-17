'use strict';

var cluster = require('cluster'),
    events  = require('events'),
    util    = require('util')

var Logger = require("./logger")

function Master(config) {
  if (!(this instanceof Master)) {
    return new Master(config);
  }

  this.logger = new Logger(config.server.accessLog);

  this.spawnWorkers(config.server.workers);
}

Master.prototype = new events.EventEmitter();

Master.prototype.spawnWorkers = function (number) {
  var self = this

  var spawnWorker = function () {
    var worker = cluster.fork();
    worker.on('message', function (message) {
      self.logger.log(message)
    });
  };

  // Spawn all workers
  for (var n = 0; n < number; n += 1) {
    util.log('Spawning worker #' + n);
    spawnWorker();
  }

  // When one worker is dead, let's respawn one
  cluster.on('exit', function (worker, code, signal) {
    self.logger.printExitMessage(worker, code, signal)
    spawnWorker();
  });

  // Set an exit handler
  var onExit = function () {
    this.emit('exit');
    util.log('Exiting, killing the workers');
    for (var id in cluster.workers) {
      var worker = cluster.workers[id];
      util.log('Killing worker #' + worker.process.pid);
      worker.destroy();
    }
    process.exit(0);
  }.bind(this);
  process.on('SIGINT', onExit);
  process.on('SIGTERM', onExit);
};

module.exports = Master;
