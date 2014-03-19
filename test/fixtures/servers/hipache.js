(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Hipache server instances.
     */

    var Server = require('./template');
    var util = require('util');

    var HipacheServer = function () {
        Server.apply(this, ['node', ['../../bin/hipache', '-c']]);
    };

    util.inherits(HipacheServer, Server);
    module.exports = HipacheServer;

})();
