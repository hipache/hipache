/*
 * This module monitors the RSS memory at a specific interval.
 *
 * If the memory theshold is reached, it will try to closed all the servers
 * attached to stop accepting new connections. If the servers did not stopped
 * after the graceful time period, the process will be forced to exit.
 * Statistics are logged before exiting.
 */

'use strict';

var cluster = require('cluster');


function MemoryMonitor(options) {
    if (!(this instanceof MemoryMonitor)) {
        return new MemoryMonitor(options);
    }

    options = options || {};
    options.memoryLimit = options.memoryLimit || 100; // 100MB
    options.gracefulWait = options.gracefulWait || 30; // 30 seconds
    options.checkInterval = options.checkInterval || 60; // 60 seconds
    options.logHandler = options.logHandler || console.log;
    this.options = options;
    this._servers = [];
    this._closing = 0;
    this.stats = {
        startTime: Date.now(),
        requests: 0,
        connections: 0,
        gracefullyExited: true
    };
    this.log = function (msg) {
        this.options.logHandler('MemoryMonitor: ' + msg);
    };
    setInterval(function () {
        this.tick();
    }.bind(this), this.options.checkInterval * 1000);
}

MemoryMonitor.prototype.tick = function () {
    var memoryLimit = (this.options.memoryLimit * 1024 * 1024);
    var currentMemory = process.memoryUsage().rss;

    if (currentMemory < memoryLimit) {
        this.log('Memory usage is OK (' + Math.round(currentMemory / (1024 * 1024)) + 'MB)');
        return;
    }
    // Limit reached, starting the exit phase
    this.log('Memory limit exceeded (' + Math.round(currentMemory / (1024 * 1024)) + 'MB), exiting...');
    this.exit();
};

MemoryMonitor.prototype.dumpStatistics = function () {
    var uptime = Date.now() - this.stats.startTime;

    this.log('=== Exceeded memory report ===');
    this.log('Gracefully exited: ' + this.stats.gracefullyExited);
    this.log('Uptime: ' + Math.round(uptime / 1000 / 60) + ' minutes');
    this.log('Requests: ' + this.stats.requests);
    this.log('Connections: ' + this.stats.connections);
};

MemoryMonitor.prototype.exit = function () {
    var n = this._servers.length;

    this.log('Waiting for ' + n + ' server handlers...');
    if (n === 0) {
        this.dumpStatistics();
        cluster.worker.destroy();
    }
    // Stop accepting new connection on this worker
    cluster.worker.disconnect();
    n -= 1;
    while (n >= 0) {
        this._closing += 1;
        this._servers[n].close();
        n -= 1;
    }
    this._servers = [];
    setTimeout(function () {
        this.log(this._closing + ' server handler is stuck, force exiting...');
        this.stats.gracefullyExited = false;
        this.dumpStatistics();
        cluster.worker.destroy();
    }.bind(this), this.options.gracefulWait * 1000);
};

MemoryMonitor.prototype.addServer = function (server) {
    server.on('request', function () {
        this.stats.requests += 1;
    }.bind(this));
    server.on('connection', function () {
        this.stats.connections += 1;
    }.bind(this));
    server.on('close', function () {
        this._closing -= 1;
        if (this._closing > 0) {
            return;
        }
        // All servers closed, exiting the current process
        this.dumpStatistics();
        cluster.worker.destroy();
    }.bind(this));
    this._servers.push(server);
};

module.exports = MemoryMonitor;
