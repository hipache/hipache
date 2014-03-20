(function () {
    'use strict';

    /**
     * This is a generic helper to instrument "foreign" servers process.
     */

    var spawn = require('child_process').spawn;
    var npmlog = require('npmlog');
    var util = require('util');
    var EventEmitter = require('events').EventEmitter;

    var Server = function (command, args) {
        var child;

        this.start = function (moreArgs, stdin) {
            moreArgs = moreArgs ? args.concat(moreArgs) : args;
            child = spawn(command, moreArgs, {cwd: process.cwd()});
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
                child.stdin.write(stdin.join('\n') + '\n');
                child.stdin.end();
            }
        };

        this.stop = function () {
            if (child) {
                child.kill('SIGTERM');
                child = null;
            }
        };
    };

    util.inherits(Server, EventEmitter);
    module.exports = Server;

})();
