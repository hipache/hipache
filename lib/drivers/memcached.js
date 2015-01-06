(function () {
    'use strict';

    var IDriver = require('../utils/idriver'),
        DriverError = require('../utils/drivererror'),
        // XXX new logging infrastructure not landed yet
        // logger = require('../logger'),
        util = require('util');

    try {
        var SubDriver = require('memcached');
    } catch (e) {
        // XXX new logging infrastructure not landed yet
        // logger.silly('IDriver', 'You must use `npm install memcached` if you want to use this adapter');
        return;
    }

    var Memc = function () {
        // Provides slave and master url properties
        IDriver.apply(this, arguments);

        var drivers = this.drivers.map(function (u) {
            // XXX new logging infrastructure not landed yet
            // if (u.auth) {
            //     logger.error('Memcached', 'This driver doesn\'t support authentication!!!');
            // }
            // TODO support unix sockets binding
            return (u.hostname || '127.0.0.1') + ':' + (u.port || '11211');
        });
        // The principal client
        // var clientReady = false;
        var client = new SubDriver(drivers);

        var prefix = '';
        if (this.drivers[0].hash) {
            prefix = this.drivers[0].hash.substr(1);
        }

        var sayErr = function (err) {
            // connected = false;
            this.emit(this.ERROR, new DriverError(DriverError.UNSPECIFIED, err));
        }.bind(this);

        // client.on('error', function (err) {
        //     this.emit('error', err);
        // }.bind(this));

        // client.on('ready', function (err) {
        //     clientReady = true;
        //     if (!this.master || clientWriteReady) {
        //         this.emit('ready', err);
        //     }
        // }.bind(this));

        // The optional master
        // var clientWriteReady = false;

        Object.defineProperty(this, 'connected', {
            get: function () {
                // XXX implement me!
                return true;
                // client.connected && (!clientWrite || clientWrite.connected);
            }
        });

        this.read = function (hosts, callback) {
            var first = hosts[0];
            hosts = hosts.map(function (host) {
                return prefix + 'frontend:' + host;
            });
            hosts.push(prefix + 'dead:' + first);

            client.getMulti(hosts, function (err, data) {
                if (err) {
                    callback(err);
                    sayErr(err);
                    return;
                }
                callback(err, hosts.map(function (key) {
                    return data[key] || [];
                }));
            });
        };

        this.create = function (host, vhost, callback) {
            client.set(prefix + 'frontend:' + host, [vhost], 0, callback);
        };

        this.add = function (host, backend, callback) {
            client.get(prefix + 'frontend:' + host, function (err, data) {
                data.push(backend);
                client.set(prefix + 'frontend:' + host, data, 0, callback);
            });
        };


        this.mark = function (frontend, id, url, len, ttl, callback) {
            client.get(
                prefix + 'dead:' + frontend,
                function (err, data) {
                    (data = data || []).push(id);
                    client.set(
                        prefix + 'dead:' + frontend,
                        data,
                        ttl,
                        callback
                    );
                }
            );
        };

        this.destructor = function () {
            client.end();
        };
    };

    util.inherits(Memc, IDriver);

    module.exports = Memc;

})();
