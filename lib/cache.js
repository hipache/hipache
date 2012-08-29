
'use strict';

/*
 * This module handles all IO called on the cache (currently Redis)
 */

var url = require('url'),
    redis = require('redis');


function Cache(options) {
    if (!(this instanceof Cache)) {
        return new Cache(options);
    }

    options = options || {};
    options.logHandler = options.logHandler || console.log;
    options.debugHandler = options.debugHandler || console.log;
    options.deadBackendTTL = options.deadBackendTTL || 30;
    this.options = options;
    this.log = function (msg) {
        this.options.logHandler('Cache: ' + msg);
    };
    this.debug = function (msg) {
        this.options.debugHandler('Cache: ' + msg);
    };
    // Configure Redis
    this.redisClient = redis.createClient(
            this.options.redisPort,
            this.options.redisHost
            );
    this.redisClient.on('error', function (err) {
        this.log('RedisError ' + err);
    }.bind(this));
}


/*
 * This method mark a dead backend in the cache by its backend id
 */
Cache.prototype.markDeadBackend = function (frontend, backendId) {
    var frontendKey = 'dead:' + frontend;
    var multi = this.redisClient.multi();
    multi.sadd(frontendKey, backendId);
    multi.expire(frontendKey, this.options.deadBackendTTL);
    multi.exec();
};


/*
 * This method is an helper to get the domain name (without the subdomain)
 */
Cache.prototype.getDomainName = function (hostname) {
    var idx = hostname.lastIndexOf('.');

    if (idx < 0) {
        return hostname;
    }
    idx = hostname.lastIndexOf('.', idx - 1);
    if (idx < 0) {
        return hostname;
    }
    return hostname.substr(idx);
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
    var index = host.indexOf(':');
    if (index > 0) {
        host = host.slice(0, index).toLowerCase();
    }
    var multi = this.redisClient.multi();
    multi.lrange('frontend:' + host, 0, -1);
    multi.lrange('frontend:*' + this.getDomainName(host), 0, -1);
    multi.smembers('dead:' + host);
    multi.exec(function (err, rows) {
        var backends = rows[0];
        if (backends.length === 0) {
            backends = rows[1];
        }
        var deads = rows[2];
        if (backends.length === 0) {
            return callback('frontend not found', 400);
        }
        var virtualHost = backends.shift();
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
                return (indexes.length - 1);
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
        if (backend.hostname === undefined) {
            return callback('backend is invalid', 502);
        }
        backend.port = (backend.port === undefined) ? 80 : parseInt(backend.port, 10);
        this.debug('Proxying: ' + host + ' -> ' + backend.hostname + ':' + backend.port);
        callback(false, 0, backend);
    }.bind(this));
};

module.exports = Cache;
