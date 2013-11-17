'use strict';

var fs = require('fs'),
    util  = require('util')



function Logger(logfilePath) {
  if (!(this instanceof Logger)) {
    return new Logger(logfilePath);
  }

  this.logfilePath = logfilePath
  this.open()

  process.on('SIGUSR1', function () {
    util.log('Caught a SIGUSR1 signal, reopening the log file.');
    this.reopen()
  });

}

Logger.prototype.logType = {
    log: 1,
    accessLog: 2
};

Logger.prototype.logMessage = function (msg, type) {
  var self = this

    // Send the log data to the master
    var message = {};
    try {
        message = {
            type: (type === undefined) ? self.logType.log : type,
            from: process.pid,
            data: msg
        };
        process.send(message);
    } catch (err) {
        // Cannot write on the master channel (worker is committing a suicide)
        // (from the memorymonitor), writing the log directly.
        if (message.type === 1) {
            util.log('(worker #' + message.from + ') ' + message.data);
        }
    }
};

Logger.prototype.debug = function (debugMode) {
  var self = this
    return function (msg) {
        if (debugMode !== true) {
            return;
        }
        self.logMessage(msg, self.logType.log);
    };
};



Logger.prototype.close = function() {
  this.stream.end();
}

Logger.prototype.open = function() {
  this.stream = fs.createWriteStream(this.logfilePath, {
    flags: 'a+',
    mode: 0x1A4 // 0644
  });
}

Logger.prototype.reopen = function() {
  this.close();
  this.open();
}

Logger.prototype.printStatusMessage = function(message) {
  util.log('(worker #' + message.from + ') ' + message.data);
}

Logger.prototype.printExitMessage = function(worker, code, signal) {
  // TODO: this can surely be written in a nicer way
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

  util.log(m);
}

Logger.prototype.printAccess = function(message) {

  var data = message.data

  var months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul',  'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

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
    // FIXME, sometimes we cannot read socketBytesWritten
    // (maybe because of a websocket?)
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

    this.stream.write(line + '\n');
}

Logger.prototype.log = function (message) {
  if (message.type === 1) {
    this.printStatusMessage(message)
  } else if (message.type == 2) {
    this.printAccess(message)
  }
};


module.exports = Logger;
