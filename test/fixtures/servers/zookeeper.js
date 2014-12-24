(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Zookeeper server instances.
     */

    var Generic = require('./generic');
    var util = require('util');

    var Zookeeper = function () {
        Generic.apply(this, ['zkServer.sh', []]);
    };

    util.inherits(Zookeeper, Generic);
    module.exports = Zookeeper;

})();
