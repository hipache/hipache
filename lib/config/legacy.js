(function () {
    'use strict';

    /**
     * Previous versions of the config file should be mapped using this method.
     * This will be called before anything else.
     * Please warn the user about deprecation.
     * Current version (say 0.4) should support previous version syntax (0.3) with a warning.
     */

    // XXX replace this with new logging infrastructure
    var log = require('util').log;

    var legacyMap = function (options) {
        if (!options.server) {
            return;
        }
        options.http = options.http || {};
        // Unless we use the new syntax, source the 0.3 keys
        options.http.port = options.http.port || options.server.port;
        options.http.bind = options.http.bind || options.server.address;
        // Same goes for https
        options.https = options.https || options.server.https || {};
        options.https.bind = options.https.bind || options.server.address;

        // If we detect legacy config, clean it up and say something
        if ('address' in options.server) {
            delete options.server.address;
            log('WARNING! `server.address` is deprecated. Please use `http(s).bind` instead.');
        }
        if ('port' in options.server) {
            delete options.server.port;
            log('WARNING! `server.port` is deprecated. Please use `http.port` instead.');
        }
        if ('https' in options.server) {
            delete options.server.https;
            log('WARNING! `server.https` is deprecated. Please use `https` instead.');
        }
    };

    module.exports = legacyMap;

})();
