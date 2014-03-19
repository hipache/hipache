(function () {
    'use strict';

    var IHipDriver = require('./ihipdriver.js'),
        util = require('util'),
        logger = require('../logger');

    try {
        var SubDriver = require('nodejs-etcd');
    } catch (e) {
        logger.silly('IHipDriver', 'You must use `npm install nodejs-etcd` if you want to use this adapter');
        return;
    }

    var Etcd = function () {
        // Provides slave and master url properties
        IHipDriver.apply(this, arguments);

        var client = new SubDriver({
            url: this.slave.protocol.replace('etcd', 'http') + '//' + (this.slave.hostname || '127.0.0.1') + ':' +
            (this.slave.port || 4001)
        });

        var prefix = '';
        if (this.slave.hash) {
            prefix = this.slave.hash.substr(1);
        }

        if (this.slave.path) {
            logger.warn('Etcd', 'You specified a path while this driver doesn\'t support databases');
        }

        if (this.slave.auth) {
            logger.error('Etcd', 'This driver doesn\'t support authentication!!!');
        }

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
            clientWrite = new SubDriver({
                url: this.slave.protocol.replace('etcd', 'http') + '://' + (this.master.hostname || '127.0.0.1') + ':' +
                    (this.master.port || 4001)
            });

            if (this.master.auth) {
                logger.error('Etcd', 'This driver doesn\'t support authentication!!!');
            }

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
            this.emit(this.ERROR, err);
        }.bind(this);

        this.read = function (hosts, callback) {
            var result = [];
            var first = hosts[0];
            hosts = hosts.map(function (host) {
                return {key: prefix + 'frontend:' + host};
            });
            hosts.push({key: prefix + 'dead:' + first});

            var lookup = function () {
                var host = hosts.shift();
                if (!host) {
                    callback(result);
                    return;
                }
                client.read(host, function (err, data) {
                    if (err) {
                        sayErr(err);
                        return;
                    }
                    result.push(data);
                    lookup();
                });
            };
            lookup();
        };

        this.create = function (host, vhost, callback) {
            client.write({
                key: prefix + 'frontend:' + host,
                value: [vhost]
            }, callback);
        };

        this.add = function (host, backend, callback) {
            client.read({
                key: prefix + 'frontend:' + host
            }, function (err, data) {
                if (err) {
                    sayErr(err);
                    return;
                }
                data.push(backend);
                client.write({
                    key: prefix + 'frontend:' + host,
                    value: data
                }, callback);
            });
        };

        this.mark = function (frontend, id, url, len, ttl) {
            (clientWrite ? clientWrite : client).write({
                key: prefix + 'dead:' + frontend,
                value: id,
                ttl: ttl
            }, function (/*err,resp, body*/) {
            });
        };

        // XXX implement this
        this.destructor = function () {
        };
    };

    util.inherits(Etcd, IHipDriver);

    module.exports = Etcd;

})();
