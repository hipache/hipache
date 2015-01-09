(function () {
    'use strict';

    /**
     * This is a generic helper to instrument "foreign" servers process.
     */

    var spawn = require('child_process').spawn;
    var npmlog = require('npmlog');
    var util = require('util');
    var EventEmitter = require('events').EventEmitter;

    var Generic = function (command, args) {
        if (!((args = args || []) instanceof Array)) {
            args = [args];
        }

        var child;
        var started = false;

        this.setCommand = function (c) {
            command = c;
        };

        this.mute = false;

        this.start = function (moreArgs, stdin) {
            if (!((moreArgs = moreArgs || []) instanceof Array)) {
                moreArgs = [moreArgs];
            }
            child = spawn(command, args.concat(moreArgs));
            var stdout = '',
                stderr = '';

            child.stdout.setEncoding('utf8');

            child.stdout.once('data', function () {
                if (!started) {
                    started = true;
                    this.emit('started');
                    npmlog.silly('Server#' + command, 'started with', args, 'and', moreArgs);
                }
            }.bind(this));

            child.stderr.once('data', function () {
                if (!started) {
                    started = true;
                    this.emit('started');
                    npmlog.silly('Server#' + command, 'started with', args, 'and', moreArgs);
                }
            }.bind(this));

            child.stdout.on('data', function (data) {
                stdout += data;
                npmlog.silly('Server#' + command, '', data);
            });

            child.stderr.setEncoding('utf8');

            child.stderr.on('data', function (data) {
                stderr += data;
                if (this.mute) {
                    npmlog.silly('Server#' + command, '', data);
                } else {
                    npmlog.error('Server#' + command, '', data);
                }
            }.bind(this));

            child.on('error', function(err) {
              var msg = 'Failed to spawn ' +
                        '"' + command + ' ' + args.concat(moreArgs) + '" ' +
                        '(' + err + ')';
              npmlog.error(msg);
              this.emit('error', new Error(msg));
            }.bind(this));

            child.on('close', function (code) {
                child = null;
                npmlog.silly('Server#' + command, '', 'Done with exit code ' + code);
                this.emit('stopped');
            }.bind(this));

            if (stdin) {
                if (stdin instanceof Array) {
                    stdin = stdin.join('\n');
                }
                child.stdin.write(stdin + '\n');
                child.stdin.end();
            }
            return this;
        };

        this.stop = function () {
            if (started) {
                npmlog.silly('Server#' + command, '', 'Will close');
                started = false;
                child.kill();
            }
            return this;
        };
    };

    util.inherits(Generic, EventEmitter);
    module.exports = Generic;

})();
