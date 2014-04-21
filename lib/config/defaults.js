(function () {
    'use strict';

    /**
     * This defines defaults that will be inserted into config.
     */

    var defaults = {
        http: {
            // Won't bind http on anything by default
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

        user: '',
        group: '',

        server: {
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
                return options[category] = options[category] || defaults[category];
            }
            if (!(category in options)) {
                options[category] = {};
            }
            Object.keys(defaults[category]).forEach(function (key) {
                options[category][key] = options[category][key] || defaults[category][key];
            });
        });
    };

    module.exports = defaultsMap;

})();
