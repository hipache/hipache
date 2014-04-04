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

        this.start = function (moreArgs, stdin) {
            if (!((moreArgs = moreArgs || []) instanceof Array)) {
                moreArgs = [moreArgs];
            }
            child = spawn(command, args.concat(moreArgs), {cwd: process.cwd()});
            var stdout = '',
                stderr = '';

            child.stdout.setEncoding('utf8');

            child.stdout.once('data', function () {
                this.emit('started');
            }.bind(this));

            child.stdout.on('data', function (data) {
                stdout += data;
                npmlog.silly('Server#' + command, '', data);
            });

            child.stderr.setEncoding('utf8');

            child.stderr.on('data', function (data) {
                stderr += data;
                npmlog.error('Server#' + command, '', data);
            });

            child.on('close', function (code) {
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
            if (child) {
                child.kill();
                child = null;
            }
            return this;
        };
    };

    util.inherits(Generic, EventEmitter);
    module.exports = Generic;

})();
