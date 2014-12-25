(function () {
    'use strict';
    var constants = require('constants');

    /**
     * This defines defaults that will be inserted into config.
     */

    var defaults = {
        http: {
            // http binds on 127.0.0.1 by default
            bind: ['127.0.0.1'],
            // If binding, will use default port unless instructed otherwise
            port: 80
        },

        https: {
            // Won't bind https on anything by default
            bind: [],
            // If binding, will use default port unless instructed otherwise
            port: 443,
            // No CA provided
            ca: [],
            secureProtocol: "SSLv23_method",
            /*jshint camelcase:false*/
            secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2,
            ciphers: [
                'DH+ECDSA+AESGCM EECDH+aRSA+AESGCM EECDH+ECDSA+SHA384',
                'EECDH+ ECDSA+SHA256 EECDH+a RSA+SHA384 EECDH+aRSA+SHA256',
                'EECDH+aRSA+RC4 EECDH EDH+aRSA RC4 !aNULL !eNULL !LOW !3DES',
                '!MD5 !EXP !PSK !SRP !DSS !RC4'
            ].join(' '),
            honorCipherOrder: true
        },

        // By default use a single redis server on localhost default port
        driver: ['redis:'],

        // XXX deb package should create www-data user
        user: 'www-data',

        server: {
            debug: false,
            workers: 10,
            maxSockets: 100,
            tcpTimeout: 30,
            deadBackendTTL: 30,
            retryOnError: 3,
            accessLog: "/var/log/hipache/access.log",
            httpKeepAlive: false,
            deadBackendOn500: true,
            staticDir: null
        }
    };

    var defaultsMap = function (options) {
        Object.keys(defaults).forEach(function (category) {
            if (defaults[category] instanceof Array || !(defaults[category] instanceof Object)) {
                if (options[category] === undefined) {
                    options[category] = defaults[category];
                }
                return  options[category];
            }
            if (!(category in options)) {
                options[category] = {};
            }
            Object.keys(defaults[category]).forEach(function (key) {
                if (options[category][key] === undefined) {
                    options[category][key] = defaults[category][key];
                }
            });
        });
    };

    module.exports = defaultsMap;

})();
