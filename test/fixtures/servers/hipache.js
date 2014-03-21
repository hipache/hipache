(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Hipache server instances.
     */

    var Generic = require('./generic');
    var util = require('util');

    var Hipache = function () {
        Generic.apply(this, ['node', ['../../bin/hipache', '-c']]);
    };

    util.inherits(Hipache, Generic);
    module.exports = Hipache;

})();
