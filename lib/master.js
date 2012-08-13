
'use strict';

var fs = require('fs'),
    cluster = require('cluster'),
    events = require('events'),
    util = require('util');

var accessLog = function (self, path) {
    var months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul',  'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    var openStream = function () {
        return fs.createWriteStream(path, {
            flags: 'a+',
            mode: 0x1A4 // 0644
        });
    };
    var stream = openStream();

    process.on('SIGUSR1', function () {
        // Reload the Stream on signal
        stream.end();
        stream = openStream();
    });
    self.on('exit', function () {
        stream.end();
    });

    // Format log
    return function (data) {
        var line = '',
            date = new Date(data.currentTime);
        var addDigit = function (n) {
            if (n < 10) {
                return '0' + n;
            }
            return n;
        };
        // Remote addr
        if (data.remoteAddr.slice(0, 2) !== '::') {
            line += '::ffff:';
        }
        line += data.remoteAddr;
        // Empty
        line += ' - - ';
        // Date
        line += '[';
        line += addDigit(date.getUTCDate());
        line += '/';
        line += months[date.getUTCMonth()];
        line += '/';
        line += date.getFullYear();
        line += ':';
        line += addDigit(date.getUTCHours());
        line += ':';
        line += addDigit(date.getUTCMinutes());
        line += ':';
        line += addDigit(date.getUTCSeconds());
        line += ' +0000] "';
        // Request
        line += data.method;
        line += ' ';
        line += data.url;
        line += ' HTTP/';
        line += data.httpVersion;
        line += '" ';
        // Status code
        line += data.statusCode;
        line += ' ';
        // Bytes sent
        //FIXME, sometimes we cannot read socketBytesWritten (maybe because of a websocket?)
        line += data.socketBytesWritten || 0;
        line += ' "';
        // Referer
        line += data.referer || '';
        line += '" "';
        // User-Agent
        line += data.userAgent || '';
        line += '" "';
        // Virtual host
        line += data.virtualHost;
        line += '" ';
        // Total time spent
        line += (data.totalTimeSpent / 1000);
        line += ' ';
        // Backend time spent
        line += (data.backendTimeSpent / 1000);
        stream.write(line + '\n');
    };
};


function Master(config) {
    if (!(this instanceof Master)) {
        return new Master(config);
    }

    accessLog = accessLog(this, config.server.accessLog);
    this.spawnWorkers(config.server.workers);
}

Master.prototype = new events.EventEmitter();

Master.prototype.spawnWorkers = function (number) {
    var workers = [];

    var spawnWorker = function () {
        var worker = cluster.fork();
        worker.on('message', function (message) {
            // Gather the logs from the workers
            if (message.type === 1) {
                // normal log
                util.log('(worker #' + message.from + ') ' + message.data);
            } else if (message.type === 2) {
                // access log
                accessLog(message.data);
            }
        });
        workers.push(worker);
    };

    // Spawn all workers
    for (var n = 0; n < number; n += 1) {
        util.log('Spawning worker #' + n);
        spawnWorker();
    }

    // When one worker is dead, let's respawn one
    cluster.on('death', function (worker) {
        var idx = workers.indexOf(worker);
        var pid = (worker.process === undefined) ? worker.pid : worker.process.pid;
        if (idx >= 0) {
            workers.splice(idx, 1);
        }
        util.log('worker (pid: ' + pid + ') died. Spawning a new one.');
        spawnWorker();
    });

    // Set an exit handler
    var onExit = function () {
        this.emit('exit');
        util.log('Exiting, killing the workers');
        workers.forEach(function (worker) {
            process.kill(worker.pid);
        });
        process.exit(0);
    }.bind(this);
    process.on('exit', onExit);
    process.on('SIGINT', onExit);
    process.on('SIGTERM', onExit);
};

module.exports = Master;
