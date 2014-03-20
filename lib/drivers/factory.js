(function () {
    'use strict';

    var url = require('url'),
        util = require('util'),
        EventEmitter = require('events').EventEmitter;

    var Factory = function () {
        this.getDriver = function (drivers) {
            if (!(drivers instanceof Array)) {
                drivers = [drivers];
            }

            var u = url.parse(drivers[0]);
            if (!u.protocol) {
                this.emit('error', 'What\'s this? Albatros?' + u);
                return;
            }

            // Better safe than sorry
            var driverName = u.protocol.replace(/[^a-z]/g, '');
            // Strip *s*ecured, except for redis, obviously
            if (driverName !== 'redis') {
                driverName = driverName.replace(/s$/, '');
            }
            var Provider;
            try {
                Provider = require('./' + driverName);
                return new Provider(drivers);
            } catch (e) {
                try {
                    // Try again with standalone module named hipache-driver-*
                    Provider = require('hipache-driver-' + driverName);
                    return new Provider(drivers);
                } catch (e) {
                    var ex = 'Failed loading provider for protocol ' + u.protocol + ' ' + e;
                    this.emit('error', ex);
                }
            }
        };
    };

    util.inherits(Factory, EventEmitter);
    module.exports = new Factory();

})();
