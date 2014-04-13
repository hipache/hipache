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
    options.memoryLimit = options.memoryLimit || 200; // 200MB
    options.gracefulWait = options.gracefulWait || 120; // 120 seconds
    options.checkInterval = options.checkInterval || 60; // 60 seconds
    options.logHandler = options.logHandler || console.log;
    this.options = options;
    this._servers = [];
    this._closing = 0;
    this._exited = false;
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

MemoryMonitor.prototype._formatMemory = function (mem) {
    return '(' + Math.round(mem / (1024 * 1024)) + 'MB)';
};

MemoryMonitor.prototype.tick = function () {
    var memoryLimit = (this.options.memoryLimit * 1024 * 1024);
    var currentMemory = process.memoryUsage().rss;

    // Memory check passed
    if (currentMemory < memoryLimit) {
        this.log('Memory usage is OK ' + this._formatMemory(currentMemory));
        return;
    }

    var msg = 'Memory limit exceeded ' + this._formatMemory(currentMemory);
    if (this._exited === true) {
        // We called exit already, waiting...
        this.log(msg + ', waiting for requests to complete...');
        return;
    }

    if (global.gc) {
        // Calling GC
        this.log(msg + ', calling GC...');
        global.gc();
        currentMemory = process.memoryUsage().rss;

        // GC free'd enough memory
        if (currentMemory < memoryLimit) {
            this.log('Memory usage is OK after GC call  ' + this._formatMemory(currentMemory));
            return;
        }
    } else {
        this.log('Warning: GC not available');
    }

    // Limit reached after calling GC, starting the exit phase
    msg = 'Memory is still over the limit after GC call ' + this._formatMemory(currentMemory);
    this.log(msg + ', calling exit...');
    this.exit();
    this._exited = true;
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
        return;
    }
    this._closing = n;
    this._servers.forEach(function (server) {
        // Stop accepting new connection on this worker
        server.close();
    });
    if (this.options.gracefulWait <= 0) {
        // No force exit
        return;
    }
    setTimeout(function () {
        this.log(this._closing + ' server handlers are stuck, force exiting...');
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
        this.log('1 server handler finished processing, ' + this._closing + ' remaining...');
        if (this._closing > 0) {
            return;
        }
        // All servers closed, exiting the current process
        this.log('All server handlers finished processing requests, clean exit.');
        this.dumpStatistics();
        cluster.worker.destroy();
    }.bind(this));
    this._servers.push(server);
};

module.exports = MemoryMonitor;
