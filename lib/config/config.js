(function () {
    'use strict';
    var fs = require('fs');

    // Default variables
    // Won't bind http on anything by default
    var DEFAULT_HTTP_BIND = [];
    // If binding, will use default port unless instructed otherwise
    var DEFAULT_HTTP_PORT = 80;
    // Won't bind https on anything by default
    var DEFAULT_HTTPS_BIND = [];
    // If binding, will use default port unless instructed otherwise
    var DEFAULT_HTTPS_PORT = 443;
    // By default use a single redis server on localhost default port
    var DEFAULT_DRIVER = ['redis:'];


    // Previous versions of the config file API should be mapped in this method.
    // This will be called before anything else.
    var legacy = function (json) {
        json.http = json.http || {};
        // Unless we use the new syntax, source the 0.3 keys
        json.http.port = json.http.port || json.server.port;
        json.http.bind = json.http.bind || json.server.address;
        // Same goes for https
        json.https = json.https || json.server.https || {};
        json.https.bind = json.https.bind || json.server.address;

        // If we used legacy config, say something
        if ('address' in json.server) {
            delete json.server.address;
            console.warn('DUG addr');
            // log('HEADS-UP! You are using deprecated configuration syntax that will get removed. Please README and update');
        }
        if ('port' in json.server) {
            delete json.server.port;
            console.warn('DUG port');
        }
        if ('https' in json.server) {
            delete json.server.https;
            console.warn('DUG https');
        }
    };

    // Main config object
    var Config = function (source/*, validate*/) {
        // Duplicate the source
        var json = JSON.parse(JSON.stringify(source || {}));

        // Ensure legacy keys are mapped somehow
        legacy(json);

        // Get functions attached to Config prototype, apply them on the json object, and derive key names as accessors
        // eg: if you introduce a new top level key (say: "something"), add a prepareSomething method on the prototype
        // of Config and have that function do whatever needs to be done on the json argument.

        var facade = {};

        Object.keys(this.constructor.prototype).forEach(function (funcName) {
            var key = /^prepare([A-Z][a-z]+)$/.exec(funcName).pop();
            if (!key) {
                return;
            }
            key = key.toLowerCase();
            // Prepare
            facade[key] = this[funcName](json[key]);
            // Define prop
            Object.defineProperty(this, key, {
                get: function () {
                    return facade[key];
                },
                enumerable: true
            });
        }, this);

        // Don't leak cert and keys here
        this.inspect = function () {
            return JSON.stringify({
                source: source,
                config: facade
            }, null, 4)
                .replace(/"((?:key|cert))": "(---[^"]+)/g, '"$1": "CENSORED"')
        };
    };

    Config.prototype.prepareDriver = function (drivers) {
        // If no driver, fallback on the default
        drivers = drivers || DEFAULT_DRIVER;

        // As we support driver: string and driver: [string, string] syntaxes, ensure we normalize
        if (!(drivers instanceof Array)) {
            drivers = [drivers];
        }
        return drivers;
    };

    Config.prototype.prepareHttp = function (http) {
        // Ensure we have an http object
        http = http || {};
        // Fallback on default global port
        http.port = http.port || DEFAULT_HTTP_PORT;
        // Fallback on default bind
        http.bind = http.bind || DEFAULT_HTTP_BIND;

        // Ensure we have an array of addresses in bind
        if (!(http.bind instanceof Array)) {
            http.bind = [http.bind];
        }

        // Iterate over each address, and ensure we have a port, or fallback on the global default
        http.bind = http.bind.map(function (item) {
            item = (item instanceof Object) ? item : {address: item};
            item.port = item.port || http.port;
            return item;
        });
        return http;
    };

    Config.prototype.prepareHttps = function (https) {
        // Ensure we have an https object
        https = https || {};
        // Port and default bind
        https.port = https.port || DEFAULT_HTTPS_PORT;
        https.bind = https.bind || DEFAULT_HTTPS_BIND;

        if (!(https.bind instanceof Array)) {
            https.bind = [https.bind];
        }

        // Ensure ca format
        https.ca = https.ca || [];
        if (!(https.ca instanceof Array)) {
            https.ca = [https.ca];
        }

        https.bind = https.bind.map(function (item) {
            item = (item instanceof Object) ? item : {address: item};
            // For each address, inherit global settings if not explicitely specified
            ['port', 'key', 'passphrase', 'cert', 'ca', 'ciphers', 'secureProtocol'].forEach(function (key) {
                item[key] = item[key] || https[key];
            });
            // Read certificates now
            item.ca = item.ca.map(function (ca) {
                return fs.readFileSync(ca, 'utf8');
            });
            item.cert = fs.readFileSync(item.cert, 'utf8');
            item.key = fs.readFileSync(item.key, 'utf8');
            return item;
        });
        return https;
    };

    Config.prototype.prepareServer = function (server) {
        return server;
    };

    module.exports = Config;

})();
