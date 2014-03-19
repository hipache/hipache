(function () {
    'use strict';

    var IHipDriver = require('./ihipdriver.js'),
        util = require('util'),
        logger = require('../logger');

    try {
        var SubDriver = require('memcached');
    } catch (e) {
        logger.silly('IHipDriver', 'You must use `npm install memcached` if you want to use this adapter');
        return;
    }

    var Memc = function () {
        // Provides slave and master url properties
        IHipDriver.apply(this, arguments);

        // The principal client
        // var clientReady = false;
        var client = new SubDriver((this.slave.host || '127.0.0.1') + ':' + (this.slave.port || 11211));

        var prefix = this.slave.path.substr(1);

        var password = this.slave.auth.split(':').pop();
        if (password) {
            logger.error('Memcached', 'This driver doesn\'t support authentication!!!');
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
            clientWrite = new SubDriver(this.master.host + ':' + this.master.port);

            // Write prefix are simply ignored
            // writePrefix = this.master.path.substr(1);

            password = this.master.auth.split(':').pop();
            if (password) {
                logger.error('Memcached', 'This driver doesn\'t support authentication!!!');
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

        Object.defineProperty(this, 'connected', {
            get: function () {
                // XXX implement me!
                return true;
                // client.connected && (!clientWrite || clientWrite.connected);
            }
        });

        this.read = function (wholeHost, mainDomain, callback) {
            var query = [
                prefix + 'frontend:' + wholeHost,
                prefix + 'frontend:' + '*' + mainDomain,
                prefix + 'frontend:' + '*',
                prefix + 'dead:' + wholeHost
            ];
            client.getMulti(query, function (err, data) {
                callback(query.map(function (key) {
                    return data[key];
                }));
            });
        };


        this.markDead = function (frontend, id, url, len, ttl) {
            (clientWrite ? clientWrite : client).set(prefix + 'dead:' + frontend, id, ttl);
        };

        this.destructor = function () {
            client.end();
            if (clientWrite) {
                clientWrite.end();
            }
        };
    };

    util.inherits(Memc, IHipDriver);

    module.exports = Memc;

})();
