(function () {
    'use strict';

    var util = require('util');

    var HipacheError = function () {
        var args = Array.prototype.slice.call(arguments);
        // Message first ("some damn error")
        this.message = args.pop();
        // Category then ("CAPITALIZED_FOO")
        this.category = args.pop();
        // Error class name
        this.name = args.shift() || 'HipacheError';
        // Get the stack trace please
        Error.captureStackTrace(this, args.shift() || this.constructor);
    };

    // Inherit Error FWIW
    util.inherits(HipacheError, Error);

    // HipacheError.prototype.toString = function () {
    //     return this.name + '|' + this.category + ': ' + this.message + ' ' + this.stack;
    // };

    // Call that to get your super module error class
    HipacheError.subClass = function (name, errors) {
        var cn = HipacheError.bind({}, name);

        errors.forEach(function (err) {
            cn[err] = err;
        });
        cn.UNSPECIFIED = HipacheError.UNSPECIFIED;
        cn.NOT_IMPLEMENTED = HipacheError.NOT_IMPLEMENTED;

        return cn;
    };

    HipacheError.UNSPECIFIED = 'UNSPECIFIED';
    HipacheError.NOT_IMPLEMENTED = 'NOT_IMPLEMENTED';

    module.exports = HipacheError;

})();
