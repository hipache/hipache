(function () {
    'use strict';

    var util = require('util'),
        url = require('url'),
        EventEmitter = require('events').EventEmitter;

    var ERROR = 'error';
    var READY = 'ready';

    var IHipDriver = function (slave, master) {

        this.ERROR = IHipDriver.ERROR = ERROR;
        this.READY = IHipDriver.READY = READY;

        slave = url.parse(slave);
        if (master) {
            master = url.parse(master);
        }

        Object.defineProperty(this, 'master', {
            get: function () {
                return master;
            }
        });

        Object.defineProperty(this, 'slave', {
            get: function () {
                return slave;
            }
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
