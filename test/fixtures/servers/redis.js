(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Redis server instances.
     */

    var Generic = require('./generic');
    var util = require('util');

    var Redis = function () {
        Generic.apply(this, ['redis-server', ['-']]);

        this.start = this.start.bind(this, null);
    };

    util.inherits(Redis, Generic);
    module.exports = Redis;

})();
