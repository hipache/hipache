(function () {
    'use strict';

    var url = require('url');
    var logger = require('../logger');

    var factory = new (function () {
        this.getDriver = function (readUrl, writeUrl) {
            var u = url.parse(readUrl);
            var Provider;
            try {
                Provider = require(u.protocol.replace(/[^a-z]/g, '')); // Better safe than sorry.
                return new Provider(readUrl, writeUrl);
            } catch (e) {
                logger.error('DataFactory', 'Failed loading provider for protocol ' + u.protocol);
            }
        };
    })();

    module.exports = factory;

})();
