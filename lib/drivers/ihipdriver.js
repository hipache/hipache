(function () {
    'use strict';

    var util = require('util'),
        url = require('url'),
        EventEmitter = require('events').EventEmitter;

    var ERROR = 'error';
    var READY = 'ready';

    var IHipDriver = function (drivers) {

        this.ERROR = IHipDriver.ERROR = ERROR;
        this.READY = IHipDriver.READY = READY;

        this.drivers = drivers.map(function (u) {
            return url.parse(u);
        });

        // Object.defineProperty(this, 'connected', {
        //     get: function () {
        //         throw new Error('NOT_IMPLEMENTED');
        //     }
        // });
    };

    IHipDriver.prototype.read = function (/*hosts, callback*/) {
        throw new Error('NOT_IMPLEMENTED');
    };

    IHipDriver.prototype.create = function (/*frontend, identifier, callback*/) {
        throw new Error('NOT_IMPLEMENTED');
    };

    IHipDriver.prototype.add = function (/*frontend, backend, callback*/) {
        throw new Error('NOT_IMPLEMENTED');
    };

    IHipDriver.prototype.mark = function (/*frontend, id, url, len, ttl, callback*/) {
        throw new Error('NOT_IMPLEMENTED');
    };

    IHipDriver.prototype.destructor = function () {
    };

    util.inherits(IHipDriver, EventEmitter);

    module.exports = IHipDriver;

})();
