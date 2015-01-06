(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Memcache server instances.
     */

    var Generic = require('./generic');
    var util = require('util');

    var Memcached = function () {
        Generic.apply(this, ['memcached', ['-p']]);
        this.mute = true;
    };

    util.inherits(Memcached, Generic);
    module.exports = Memcached;

})();
