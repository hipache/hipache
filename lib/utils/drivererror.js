(function () {
    'use strict';

    var DriverError = require('./error').subClass(
        // A specific error class for drivers
        'DriverError',
        [
        // URLs without a scheme
            'BOGUS_URL',
        // Schemes pointing to non-existent drivers
            'MISSING_DRIVER',
        // Broken implementations
            'BROKEN_DRIVER',
        // API version mismatch
            'VERSION_MISMATCH'
        ]);

    module.exports = DriverError;

})();
