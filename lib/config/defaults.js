(function () {
    'use strict';

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
            ca: []
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
            deadBackendOn500: true
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
