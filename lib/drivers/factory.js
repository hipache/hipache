(function () {
    'use strict';

    var url = require('url'),
        util = require('util'),
        DriverError = require('../utils/drivererror'),
        EventEmitter = require('events').EventEmitter;

    var Factory = function () {

        this.getDriver = function (drivers) {
            // Get the first one and decide what driver that will be
            var u = url.parse(drivers[0]);
            if (!u.protocol) {
                return this.emit(
                    'error',
                    new DriverError(DriverError.BOGUS_URL, 'No scheme in there? ' + u)
                );
            }

            // Better safe than sorry - drivers names are alpha chars only
            var driverName = u.protocol.replace(/[^a-z]/gi, '');
            // If the scheme ends with an "s" (like *s*ecured), strip it (save redis, obviously)
            if (driverName !== 'redis') {
                driverName = driverName.replace(/s$/, '');
            }
            // Now, try to require that driver from the core, here
            var Provider;
            try {
                Provider = require('./' + driverName);
            } catch (e) {
                // Failed? Try again with a standalone named hipache-driver-*
                try {
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
