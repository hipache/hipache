(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Etcd server instances.
     */

    var Server = require('./template');
    var util = require('util');

    var EtcdServer = function () {
        Server.apply(this, ['etcd', []]);
    };

    util.inherits(EtcdServer, Server);
    module.exports = EtcdServer;

})();
