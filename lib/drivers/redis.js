(function () {
    'use strict';

    var IDriver = require('../utils/idriver'),
        DriverError = require('../utils/drivererror'),
        redis = require('redis'),
        // XXX new logging infrastructure not landed yet
        // logger = require('../logger'),
        util = require('util');

    var Redis = function () {
        // Provides slave and master url properties
        IDriver.apply(this, arguments);

        var slave = this.drivers.shift();
        var master = this.drivers.pop();

        // The principal redis client
        var clientReady = false;
        var client = redis.createClient(slave.port || 6379, slave.hostname || '127.0.0.1');

        var prefix = '';
        if (slave.hash) {
            prefix = slave.hash.substr(1);
        }

        var db;
        if (slave.path && (db = slave.path.substr(1))) {
            client.select(db);
        }
        var password;
        if (slave.auth && (password = slave.auth.split(':').pop())) {
            client.auth(password);
        }

        client.on('error', function (err) {
            // Re-emit unspecified error as is
            this.emit(this.ERROR, new DriverError(DriverError.UNSPECIFIED, err));
        }.bind(this));

        client.on('ready', function (err) {
            clientReady = true;
            if (!clientWrite || clientWriteReady) {
                this.emit(this.READY, err);
            }
        }.bind(this));

        // The optional redis master
        var clientWriteReady = false;

        var clientWrite;

        if (master) {
            clientWrite = redis.createClient(master.port, master.hostname);

            if (master.path && (db = master.path.substr(1))) {
                clientWrite.select(db);
            }
            if (master.auth && (password = master.auth.split(':').pop())) {
                clientWrite.auth(password);
            }

            clientWrite.on('error', function (err) {
                // Re-emit unspecified error as is
                this.emit(this.ERROR, new DriverError(DriverError.UNSPECIFIED, err));
            }.bind(this));

            clientWrite.on('ready', function (err) {
                clientWriteReady = true;
                if (clientReady) {
                    this.emit(this.READY, err);
                }
            }.bind(this));
        }

        // Redis specific: passiveChecks mechanism
        var passiveCheck = true;

        var monitorActiveChecker = function () {
            client.get('hchecker_ping', function (err, reply) {
                if (passiveCheck !== ((Math.floor(Date.now() / 1000) - reply) > 30)) {
                    // XXX new logging infrastructure not landed yet
                    // if (passiveCheck) {
                    //     logger.info('Redis', 'Disabling passive checks (active hchecker detected).');
                    // } else {
                    //     logger.info('Redis', 'Enabling passive checks (active hchecker stopped).');
                    // }
                    passiveCheck = !passiveCheck;
                }
            });
        };

        var monitorPoller = setInterval(monitorActiveChecker, 30 * 1000);


        Object.defineProperty(this, 'connected', {
            get: function () {
                return client.connected && (!clientWrite || clientWrite.connected);
            }
        });

        this.read = function (hosts, callback) {
            var multi = client.multi();
            var first = hosts[0];
            hosts.forEach(function (host) {
                multi.lrange(prefix + 'frontend:' + host, 0, -1);
            });
            multi.smembers(prefix + 'dead:' + first);
            multi.exec(function (err, data) {
                data[data.length - 1] = data[data.length - 1].map(function (index) {
                    return parseInt(index, 10);
                });
                callback(err, data);
            });
        };

        this.create = function (host, vhost, callback) {
            client.rpush(prefix + 'frontend:' + host, vhost, callback);
        };

        this.add = this.create;

        this.mark = function (frontend, id, url, len, ttl, callback) {
            var frontendKey = prefix + 'dead:' + frontend;
            var multi = (clientWrite ? clientWrite : client).multi();

            // Update the Redis only if passive checks are enabled
            if (passiveCheck) {
                multi.sadd(frontendKey, id);
                multi.expire(frontendKey, ttl);
            }
            // Announce the dead backend on the "dead" channel
            multi.publish('dead', frontend + ';' + url + ';' + id + ';' + len);
            multi.exec(callback);
        };

        this.destructor = function () {
            clearInterval(monitorPoller);
            client.end();
            if (clientWrite) {
                clientWrite.end();
            }
        };
    };

    util.inherits(Redis, IDriver);

    module.exports = Redis;

})();
