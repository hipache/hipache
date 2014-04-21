(function () {
    'use strict';

    var ConfigError = require('../utils/error').subClass(
        // A specific error class for drivers
        'ConfigError',
        [
            // Borked json get this
            'INVALID_JSON',
            // If one really wants to run as root, he needs to say so
            'ROOT_NEEDS_ROOT',
            // Missing certificates files or unauthorized, etc
            'CANT_READ_FILE',
            // SSL key or cert is missing
            'MISSING_KEY'
        ]);

    module.exports = ConfigError;

})();
