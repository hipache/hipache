(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Etcd server instances.
     */

    var Generic = require('./generic');
    var util = require('util');

    var Etcd = function () {
        Generic.apply(this, ['etcd', []]);
    };

    util.inherits(Etcd, Generic);
    module.exports = Etcd;

})();
