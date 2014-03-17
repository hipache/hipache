(function(){
    'use strict';

    var spawn = require('child_process').spawn;
    var npmlog = require('npmlog');
    var path = require('path');

    var RedisServer = function (/*confName*/) {
        var child;

        this.start = function (options) {
            // Finally execute your script below - here "ls -lA"
            child = spawn("redis-server", ['-'
                    // path.join(__dirname, 'redis-' + (confName || 'default') + '.conf')
                ], {cwd: process.cwd()});
            var stdout = '',
                stderr = '';

            child.stdout.setEncoding('utf8');

            child.stdout.on('data', function (data) {
                stdout += data;
                npmlog.silly('RedisServer', '', data);
            });

            child.stderr.setEncoding('utf8');

            child.stderr.on('data', function (data) {
                stderr += data;
                npmlog.error('RedisServer', '', data);
            });

            child.on('close', function(code) {
                npmlog.silly('RedisServer', '', "Done with exit code " + code);
            });

            child.stdin.write(options.join('\n') + '\n');
            child.stdin.end();
        };

        this.stop = function () {
            if (child) {
                child.kill('SIGTERM');
                child = null;
            }
        };
    };

    module.exports = RedisServer;

})();
