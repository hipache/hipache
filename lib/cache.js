
'use strict';

/*
 * This module handles all IO called on the cache (currently Redis)
 */

var url = require('url'),
    factory = require('./drivers/factory'),
    LruCache = require('./lru');


function Cache(config, handlers) {
    if (!(this instanceof Cache)) {
        return new Cache(config, handlers);
    }

    var logHandler = handlers.logHandler || console.log,
        debugHandler = handlers.debugHandler || console.log;
    this.config = config;

    this.log = function (msg) {
        logHandler('Cache: ' + msg);
    };
    this.debug = function (msg) {
        debugHandler('Cache: ' + msg);
    };

    if (!('driver' in config)) {
        if (config.redisHost || config.redisPort) {
            this.log('WARNING: old redis syntax is deprecated! Please migrate to {"driver": ["redis://host:port", "redis://masterhost:port"]}');
        }
        var driver = 'redis://';
        if (config.redisPassword) {
            driver += ':' + config.redisPassword + '@';
        }

        driver += config.redisHost || '';
        if (config.redisPort) {
            driver += ':' + config.redisPort;
        }

        if (config.redisDatabase) {
            driver += '/' + config.redisDatabase;
        }

        config.driver = [driver];

        if (config.redisMasterHost) {
            driver = 'redis://';
            if (config.redisMasterPassword) {
                driver += ':' + config.redisMasterPassword + '@';
            }

            driver += config.redisMasterHost || '';
            if (config.redisMasterPort) {
                driver += ':' + config.redisMasterPort;
            }

            if (config.redisMasterDatabase) {
                driver += '/' + config.redisMasterDatabase;
            }
            config.driver.push(driver);
        }

    }

    this.client = factory.getDriver(config.driver);

    this.client.on('error', function (err) {
        this.log('DriverError ' + err);
    }.bind(this));

    // LRU cache for Redis lookups
    this.lru = new LruCache();
    this.lru.enabled = config.server.lruCache;
}

/*
 * This method mark a dead backend in the cache by its backend id
 */
Cache.prototype.markDeadBackend = function (backendInfo) {
    this.client.mark(
        backendInfo.frontend,
        backendInfo.backendId,
        backendInfo.backendUrl,
        backendInfo.backendLen,
        this.config.server.deadBackendTTL,
        function () {

        }
    );

    // A dead backend invalidates the LRU
    this.lru.del(backendInfo.frontend);
};


/*
 * This method is an helper to get the domain name (to a given depth for subdomains)
 */
Cache.prototype.getDomainName = function (hostname, depth) {
    // Split the hostname on .
    var domains = hostname.split('.');

    if (depth >= domains.length) {
        return false;
    }

    // Get the last nth domain labels, where n = depth and join them again
    var partialDomain = domains.slice(domains.length - depth).join('.');

    return '.' + partialDomain;
};


/*
 * This method picks up a backend randomly and ignore dead ones.
 * The parsed URL of the chosen backend is returned.
 * The method also decides which HTTP error code to return according to the
 * error.
 */
Cache.prototype.getBackendFromHostHeader = function (host, callback) {
    if (host === undefined) {
        return callback('no host header', 400);
    }
    if (host === '__ping__') {
        return callback('ok', 200);
    }
    var index = host.indexOf(':');
    if (index > 0) {
        host = host.slice(0, index).toLowerCase();
    }

    var readFromCache = function (hostKey, cb) {
        // Let's try the LRU cache first
        var rows = this.lru.get(hostKey);
        if (rows !== undefined) {
            return cb(rows);
        }
        this.client.read(this.getDomainName(hostKey), function (err, rows) {
            this.lru.set(hostKey, rows);
            cb(rows);
        }.bind(this));
        // // The entry is not in the LRU cache, let's do a request on Redis
        // var multi = this.client.multi();
        // multi.lrange('frontend:' + hostKey, 0, -1);

        // // Search for wildcards up to 5 subdomains deep, from most-specific to least-specific
        // for (var i = 5; i > 0; i--) {
        //     var domainName = this.getDomainName(hostKey, i);
        //     if (domainName) {
        //         multi.lrange('frontend:*' + domainName, 0, -1);
        //     }
        // }
        // multi.lrange('frontend:*', 0, -1);
        // multi.smembers('dead:' + hostKey);
        // multi.exec(
        // );
    }.bind(this);

    readFromCache(host, function (rows) {
        var backends;
        for (var i = 0; i < rows.length - 1; i++) {
            backends = rows[i];

            if (backends.length !== 0) {
                break;
            }
        }

        var deads = rows[rows.length - 1];
        if (backends.length === 0) {
            return callback('frontend not found', 400);
        }
        var virtualHost = backends[0];
        backends = backends.slice(1); // copy to not modify the lru in place
        var index = (function () {
            // Pickup a random backend index
            var indexes = [];
            for (var i = 0; i < backends.length; i += 1) {
                if (deads.indexOf(i.toString()) >= 0) {
                    continue; // Ignoring dead backends
                }
                indexes.push(i); // Keeping only the valid backend indexes
            }
            if (indexes.length < 2) {
                return (indexes.length === 1) ? indexes[0] : -1;
            }
            return indexes[Math.floor(Math.random() * indexes.length)];
        }());
        if (index < 0) {
            return callback('Cannot find a valid backend', 502);
        }
        var backend = url.parse(backends[index]);
        backend.id = index; // Store the backend index
        backend.frontend = host; // Store the associated frontend
        backend.virtualHost = virtualHost; // Store the associated vhost
        backend.len = backends.length;
        if (backend.hostname === undefined) {
            return callback('backend is invalid', 502);
        }
        backend.port = (backend.port === undefined) ? 80 : parseInt(backend.port, 10);
        this.debug('Proxying: ' + host + ' -> ' + backend.hostname + ':' + backend.port);
        callback(false, 0, backend);
    }.bind(this));
};

module.exports = Cache;
