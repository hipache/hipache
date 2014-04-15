(function () {
    'use strict';

    var util = require('util'),
        url = require('url'),
        DriverError = require('./drivererror'),
        EventEmitter = require('events').EventEmitter;

    var ERROR = 'error';
    var READY = 'ready';

    var IDriver = function (drivers) {

        this.ERROR = IDriver.ERROR = ERROR;
        this.READY = IDriver.READY = READY;

        this.drivers = drivers.map(function (u) {
            return url.parse(u);
        });

        // Object.defineProperty(this, 'connected', {
        //     get: function () {
        //         throw new Error('NOT_IMPLEMENTED');
        //     }
        // });
    };

    IDriver.prototype.read = function (/*hosts, callback*/) {
        this.emit('error', new DriverError(DriverError.NOT_IMPLEMENTED));
    };

    IDriver.prototype.create = function (/*frontend, identifier, callback*/) {
        this.emit('error', new DriverError(DriverError.NOT_IMPLEMENTED));
    };

    IDriver.prototype.add = function (/*frontend, backend, callback*/) {
        this.emit('error', new DriverError(DriverError.NOT_IMPLEMENTED));
    };

    IDriver.prototype.mark = function (/*frontend, id, url, len, ttl, callback*/) {
        this.emit('error', new DriverError(DriverError.NOT_IMPLEMENTED));
    };

    IDriver.prototype.destructor = function () {
    };

    util.inherits(IDriver, EventEmitter);

    module.exports = IDriver;

})();
