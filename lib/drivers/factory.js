(function () {
    'use strict';

    var url = require('url'),
        util = require('util'),
        DriverError = require('../utils/drivererror'),
        EventEmitter = require('events').EventEmitter;

    var Factory = function () {

        this.getDriver = function (drivers) {
            if (!(drivers instanceof Array)) {
                drivers = [drivers];
            }

            var u = url.parse(drivers[0]);
            if (!u.protocol) {
                return this.emit(
                    'error',
                    new DriverError(DriverError.BOGUS_URL, 'No scheme in there? ' + u)
                );
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
            } catch (e) {
                try {
                    // Try again with standalone module named hipache-driver-*
                    Provider = require('hipache-driver-' + driverName);
                } catch (e) {
                    return this.emit(
                        'error',
                        new DriverError(DriverError.MISSING_DRIVER, 'No driver for ' + u.protocol)
                    );
                }
            }
            // XXX test IDriver inheritance and version check
            try {
                return new Provider(drivers);
            } catch (e) {
                return this.emit(
                    'error',
                    new DriverError(
                        DriverError.BROKEN_DRIVER,
                        'The driver for ' + u.protocol + ' is likely broken (' + e + ')')
                );
            }
        };
    };

    util.inherits(Factory, EventEmitter);

    module.exports = new Factory();

})();
