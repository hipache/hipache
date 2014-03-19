(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Memcache server instances.
     */

    var Server = require('./template');
    var util = require('util');

    var MemcachedServer = function () {
        Server.apply(this, ['memcached', ['-p']]);
    };

    util.inherits(MemcachedServer, Server);
    module.exports = MemcachedServer;

})();
