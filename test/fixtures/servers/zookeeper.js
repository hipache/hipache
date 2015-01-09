(function () {
    'use strict';

    /**
     * A server wrapper to manipulate Zookeeper server instances.
     */

    var Generic = require('./generic');
    var util = require('util');
    var exec = require('child_process').exec;

    var service = 'zkServer.sh';

    var Zookeeper = function () {
        Generic.apply(this, [service, ['start']]);
        // Zookeeper happily outputs to stderr, so, shut it up
        this.mute = true;

        var derefStart = this.start;

        this.start = function () {
            var passargs = arguments;
            exec('which ' + service, function (error/*, stdout, stderr*/) {
                // Assume brew osx install in case we didn't find it
                if (error) {
                    service = 'zkServer';
                }
                // Rebind now
                this.setCommand(service);
                // And start
                derefStart.apply(this, passargs);
            }.bind(this));
            return this;
        };

        this.stop = function () {
            Generic.apply(this, [service, ['stop']]);
            this.mute = true;
            this.start();
            return this;
        };
    };

    util.inherits(Zookeeper, Generic);
    module.exports = Zookeeper;

})();
