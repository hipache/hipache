(function () {
    'use strict';
    var fs = require('fs'),
        EventEmitter = require('events').EventEmitter,
        util = require('util');

    var ConfigError = require('./error'),
        legacy = require('./legacy'),
        defaults = require('./defaults');


    var Config = function (source) {
        // If we were passed a string, try to parse JSON
        if (source instanceof Buffer) {
            source = source.toString();
        }
        if (!(source instanceof Object)) {
            try {
                source = JSON.parse(source || '{}');
            } catch (e) {
                return this.emit('error', new ConfigError(
                    ConfigError.INVALID_JSON,
                    'Something wrong in your config! ' + e)
                );
            }
        }

        // Duplicate the object anyhow
        var options = JSON.parse(JSON.stringify(source));

        // Ensure legacy keys are mapped
        legacy(options);

        // Ensure defaults values are enforced
        defaults(options);

        // Read functions attached to Config prototype named "prepareXxx", apply them on the object,
        // and derive key names as accessors.
        // eg: if you introduce a new top level key (say: "something"), add a prepareSomething method on the prototype
        // of Config and have that function do whatever needs to be done on the argument.

        Object.keys(this.constructor.prototype).forEach(function (funcName) {
            var key = /^prepare([A-Z][a-z]+)$/.exec(funcName).pop();
            if (!key) {
                return;
            }
            key = key.toLowerCase();
            // Prepare
            options[key] = this[funcName](options[key]);
            // Define prop
            Object.defineProperty(this, key, {
                get: function () {
                    return options[key];
                },
                enumerable: true
            });
        }, this);

        // This paves the way to asynchronous configuration (eg: test redis / load certs asynch)
        process.nextTick(function () {
            this.emit('ready');
        }.bind(this));

        // Don't leak cert and keys here - this will still show drivers password, though
        this.inspect = function () {
            return JSON.stringify({
                source: source,
                config: options
            }, null, 4)
                .replace(/"((?:key|cert))": "(---[^"]+)/g, '"$1": "CENSORED"');
        };
    };

    util.inherits(Config, EventEmitter);

    Config.prototype.prepareDriver = function (drivers) {
        // As we support driver: string and driver: [string, string] syntaxes, ensure we normalize
        return (drivers instanceof Array) ? drivers : [drivers];
    };

    Config.prototype.prepareHttp = function (http) {
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

    //
    Config.prototype.prepareHttps = function (https) {
        if (!(https.bind instanceof Array)) {
            https.bind = [https.bind];
        }

        if (!(https.ca instanceof Array)) {
            https.ca = [https.ca];
        }

        https.bind = https.bind.map(function (item) {
            item = (item instanceof Object) ? item : {address: item};
            // For each address, inherit global settings if not explicitly specified
            [
                'port',
                'key', 'cert', 'ca',
                'ciphers', 'honorCipherOrder',
                'secureProtocol', 'secureOptions'
            ].forEach(function (key) {
                item[key] = item[key] || https[key];
            });
            // If we share the same key as global, have the passphrase as well, unless overridden
            if (https.key === item.key) {
                item.passphrase = item.passphrase || https.passphrase;
            }
            // We need a cert and key
            if (!item.cert || !item.key) {
                return this.emit('error', new ConfigError(
                    ConfigError.MISSING_KEY,
                    'You need a certificate and key for https to work!'
                ));
            }
            // Read certificates now
            try {
                item.ca = item.ca.map(function (ca) {
                    return fs.readFileSync(ca, 'utf8');
                });
                item.cert = fs.readFileSync(item.cert, 'utf8');
                item.key = fs.readFileSync(item.key, 'utf8');
            } catch (e) {
                return this.emit('error', new ConfigError(ConfigError.CANT_READ_FILE, 'Couldn\'t read file!' + e));
            }
            return item;
        }, this);
        return https;
    };

    Config.prototype.prepareUser = function (user) {
        // If we are running as root...
        if (process.getuid() === 0) {
            // ... and the user really wants that, let him...
            if (user === 0 || user === 'root') {
                return 0;
            }
            // Otherwise, if he didn't explicitly required root, scream and quit
            if (user === undefined || user === '') {
                this.emit('error', new ConfigError(
                    ConfigError.ROOT_NEEDS_ROOT,
                    'If you are really sure you want to run as root, you need to say so in the config' +
                    '`user`: `root`'
                    )
                );
            }
        }
        return user;
    };

    Config.prototype.prepareGroup = function (group) {
        return group;
    };

    Config.prototype.prepareServer = function (server) {
        return server;
    };

    module.exports = Config;

})();
