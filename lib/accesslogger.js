(function () {
    'use strict';

    var fs = require('fs'),
        util = require('util'),
        EventEmitter = require('events').EventEmitter;

    var months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul',  'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    var addDigit = function (n) {
        if (n < 10) {
            return '0' + n;
        }
        return n;
    };

    var AccessLogger = function (path) {

        var stream;

        var sayErr = (function (e) {
            process.nextTick(function () {
                this.emit('error', e);
            }.bind(this));
        }.bind(this));

        var start = this.start = function () {
            stream = fs.createWriteStream(path, {
                flags: 'a+',
                mode: 0x1A4 // 0644
            });
            stream.on('error', sayErr);
        };

        var stop = this.stop = function () {
            stream.end();
        };

        process.on('SIGUSR1', function () {
            // Reload the Stream on signal
            util.log('Caught a SIGUSR1 signal, reopening the log file.');
            stop();
            start();
        });

        try {
            start();
        } catch (e) {
            sayErr(e);
        }

        this.log = function (data) {
            var line = 'x_forwarded_for="', date = new Date(data.currentTime);
            // Remote addr
            if (!data.remoteAddr || data.remoteAddr.slice(0, 2) !== '::') {
                line += '::ffff:';
            }
            line += data.remoteAddr;
            
            // Empty
            line += '" ';
            // Date
            line += 'timestamp="';
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
            line += ' +0000" request="';
            // Request
            line += data.method;
            line += ' ';
            line += data.url;
            line += ' HTTP/';
            line += data.httpVersion;
            line += '" status_code=';
            // Status code
            line += data.statusCode;
            line += ' bytes_sent=';
            // Bytes sent
            //FIXME, sometimes we cannot read socketBytesWritten (maybe because of a websocket?)
            line += data.socketBytesWritten || 0;
            line += ' referrer="';
            // Referer
            line += data.referer || '';
            line += '" user_agent="';
            // User-Agent
            line += data.userAgent || '';
            line += '" virtual_host="';
            // Virtual host
            line += data.virtualHost;
            line += '" request_time=';
            // Total time spent
            line += (data.totalTimeSpent / 1000);
            line += ' backend_time=';
            // Backend time spent
            line += (data.backendTimeSpent / 1000);
            // Unique ID
            line += ' unique_id="';
            line += data.uniqueId;
            line += '"';
            stream.write(line + '\n');
        };
    };

    util.inherits(AccessLogger, EventEmitter);

    module.exports = AccessLogger;

})();
