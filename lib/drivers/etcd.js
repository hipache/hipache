(function () {
    'use strict';

    var IDriver = require('../utils/idriver'),
        DriverError = require('../utils/drivererror'),
        // XXX new logging infrastructure not landed yet
        // logger = require('../logger'),
        util = require('util');

    try {
        var SubDriver = require('node-etcd');
    } catch (e) {
        // XXX new logging infrastructure not landed yet
        // logger.error('IDriver', 'You must use `npm install node-etcd` if you want to use this adapter');
        return;
    }

    var Etcd = function () {
        // Provides slave and master url properties
        IDriver.apply(this, arguments);

        this.slave = this.drivers.shift();
        this.master = this.drivers.pop();

        var client = new SubDriver(
            this.slave.hostname || '127.0.0.1',
            this.slave.port || 4001
        );

        var prefix = '';
        if (this.slave.hash) {
            prefix = this.slave.hash.substr(1);
        }

        // XXX new logging infrastructure not landed yet
        // if (this.slave.path && this.slave.path !== '/') {
        //     logger.warn('Etcd', 'You specified a path while this driver doesn\'t support databases');
        // }

        // if (this.slave.auth) {
        //     logger.error('Etcd', 'This driver doesn\'t support authentication!!!');
        // }

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

        var clientWrite;

        if (this.master) {
            clientWrite = new SubDriver(
                this.master.hostname || '127.0.0.1',
                this.master.port || 4001
            );

            // XXX new logging infrastructure not landed yet
            // if (this.master.auth) {
            //     logger.error('Etcd', 'This driver doesn\'t support authentication!!!');
            // }

            // clientWrite.on('error', function (err) {
            //     this.emit('error', err);
            // }.bind(this));

            // clientWrite.on('ready', function (err) {
            //     clientWriteReady = true;
            //     if (clientReady) {
            //         this.emit('ready', err);
            //     }
            // }.bind(this));
        }

        var connected = false;

        Object.defineProperty(this, 'connected', {
            get: function () {
                // XXX implement me!
                return true;
            }
        });

        var sayErr = function (err) {
            connected = false;
            this.emit(this.ERROR, new DriverError(DriverError.UNSPECIFIED, err));
        }.bind(this);

        this.read = function (hosts, callback) {
            var result = [];
            var first = hosts[0];
            hosts = hosts.map(function (host) {
                return prefix + 'frontend:' + host;
            });
            hosts.push(prefix + 'dead:' + first);

            var lookup = function () {
                var host = hosts.shift();
                if (!host) {
                    callback(null, result);
                    return;
                }
                client.get(host, function (err, data/*, body*/) {
                    if (err && err.errorCode !== 100) {
                        sayErr(err);
                        callback(err);
                        return;
                    }
                    result.push(JSON.parse(data ? data.node.value : '[]'));
                    lookup();
                });
            };
            lookup();
        };

        this.create = function (host, vhost, callback) {
            client.set(
                prefix + 'frontend:' + host,
                JSON.stringify([vhost]),
                function (err, data) {
                    callback(err, JSON.parse(data ? data.node.value : '[]'));
                }
            );
        };

        this.add = function (host, backend, callback) {
            client.get(
                prefix + 'frontend:' + host,
                function (err, data) {
                    data = JSON.parse(data.node.value);
                    data.push(backend);
                    client.set(prefix + 'frontend:' + host, JSON.stringify(data), function (err, data) {
                        callback(err, JSON.parse(data ? data.node.value : '[]'));
                    });
                }
            );
        };

        this.mark = function (frontend, id, url, len, ttl, callback) {
            var cl = (clientWrite ? clientWrite : client);
            client.get(
                prefix + 'dead:' + frontend,
                function (err, data) {
                    data = JSON.parse(data ? data.node.value : '[]');
                    data.push(id);
                    cl.set(
                        prefix + 'dead:' + frontend,
                        JSON.stringify(data),
                        {ttl: ttl},
                        callback
                    );
                }
            );
        };

        // XXX implement this
        this.destructor = function () {
        };
    };

    util.inherits(Etcd, IDriver);

    module.exports = Etcd;

})();
