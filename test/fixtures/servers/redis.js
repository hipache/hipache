(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Redis server instances.
     */

    var Server = require('./template');
    var util = require('util');

    var redis = require('redis');

    var RedisServer = function () {
        Server.apply(this, ['redis-server', ['-']]);

        var redisController;

        var pStart = this.start;
        this.start = function (stdin) {
            pStart.apply(this, [null, stdin]);
            redisController = redis.createClient(stdin.join('\n').match(/port ([0-9]+)/).pop(), '127.0.0.1');
            redisController.on('error', function () {});
        };

        this.feed = function (key, value, callback) {
            redisController.rpush(key, value, callback);
        };

        Object.defineProperty(this, 'client', {
            get: function () {
                return redisController;
            }
        });

    };

    util.inherits(RedisServer, Server);
    module.exports = RedisServer;

})();
