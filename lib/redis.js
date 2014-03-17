(function () {
    'use strict';

    var redis = require('redis'),
        util = require('util'),
        EventEmitter = require('events').EventEmitter;

    var Redis = function (host, port, db, password) {
        var client = redis.createClient(port || 6379, host || '127.0.0.1');

        client.on('error', function (err) {
            this.emit('error', err);
        }.bind(this));

        client.on('ready', function (err) {
            this.emit('ready', err);
        }.bind(this));

        Object.defineProperty(this, 'connected', {
            get: function () {
                return client.connected;
            }
        });

        if (db) {
            client.select(db);
        }
        if (password) {
            client.auth(password);
        }

        this.multi = function () {
            return client.multi();
        };

        // this.publish = function(channel, message){
        //   client.publish(channel, message);
        // };

        // this.subscribe = function(channel, callback){
        //   client.subscribe(channel);
        //   client.on("message", callback);
        // };

        this.get = function (key, callback) {
            return client.get(key, callback);
        };

        this.stop = function () {
            client.end();
        };
    };

    util.inherits(Redis, EventEmitter);

    module.exports = Redis;

})();
