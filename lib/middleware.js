'use strict';

var path = require('path');

var hipacheVersion = require(path.join(__dirname, '..', 'package.json')).version;  // jshint ignore:line

function setResponseHeader(headerName, headerValueExpr) {
    return function(req, res, next) {
        var headerValue = eval(headerValueExpr);  // jshint ignore:line
        res.setHeader(headerName, headerValue);
        next();
    };
}

module.exports.setResponseHeader = setResponseHeader;
