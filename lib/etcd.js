'use strict';

var Client = require('node-etcd'),
    redis = require('redis'),
    util = require('util');

function Etcd(config) {
    if (!(this instanceof Etcd)) {
        return new Etcd(config);
    }

    this.config = config;

    // Add etcd path from environment
    if (!process.env.ETCD_PATH) {
        process.env.ETCD_PATH = "public";
    }

    this.config.etcd.path += '/' + process.env.ETCD_PATH + '/';

    // Configure Redis
    this.redisClient = redis.createClient(
        this.config.redis.port,
        this.config.redis.host
    );

    //select database
    if (this.config.redis.database) {
        this.redisClient.select(this.config.redis.database);
    }

    //auth redis
    if (this.config.redis.password) {
        this.redisClient.auth(this.config.redis.password);
    }

    this.redisClient.on('error', function (err) {
        console.error('RedisError ' + err);
    }.bind(this));

    // configure etcd
    this.client = new Client(this.config.etcd.host, this.config.etcd.port);

    this.getAll(function(err) {
      if (err) {
          console.error(err);
          process.exit(1);
      }
      this.watch();
    }.bind(this));
};

Etcd.prototype.initialize = function(cb) {
    this.client.mkdir(this.config.etcd.path, function(err) {
        if (err) {
            return cb(err);
        }
        if (cb) cb();
    }.bind(this));
};

Etcd.prototype.getAll = function(cb) {
    this.client.get(this.config.etcd.path, { recursive: true }, function(err, data) {
        if (err) {
            if (err.errorCode === 100) {
                return this.initialize(cb)
            } else {
                return cb(err);
            }
        }
        var backends = {};
        if (data.node.nodes) {
            data.node.nodes.forEach(function(node) {
                if (node.nodes) {
                    var hostname = node.key.replace(this.config.etcd.path, '')
                    backends[hostname] = node.nodes.map(function(backend) {
                        return backend.value;
                    });
                }
            }.bind(this));
        }
        this.updateAllBackends(backends);
        if (cb) cb();
    }.bind(this));
};

Etcd.prototype.updateAllBackends = function(backends) {
    this.redisClient.flushdb(function(err) {
        Object.keys(backends).forEach(function(hostname) {
            this.redisClient.rpush("frontend:" + hostname, "foo");
            backends[hostname].forEach(function(backend) {
                this.addBackend(hostname, backend);
            }.bind(this));
        }.bind(this));
    }.bind(this));
};

Etcd.prototype.addBackend = function(backend, url, cb) {
    var key = "frontend:" + backend.hostname;
    this.redisClient.lrange(key, 0, -1, function(err, backends) {
        if (err) {
            return console.error(err);
        }

        var exists = backends.some(function(item) {
            return item === url;
        });

        if (exists) {
            return;
        }

        console.log("add backend: " + key + " " + url);
        this.redisClient.rpush(key, url, function() {
            this.redisClient.hset("backendmapping", backend.container, url, function() {
                if (cb) cb();
            });
        }.bind(this));
    }.bind(this));
};

Etcd.prototype.removeBackend = function(backend) {
    this.redisClient.hget("backendmapping", backend.container, function(err, url) {
        if (err) {
            return console.error(err);
        }

        console.log("remove backend: frontend:" + backend.hostname + " " + url);
        this.redisClient.lrem("frontend:" + backend.hostname, 0, url);
        this.redisClient.hdel("backendmapping", backend.container);
    }.bind(this));
};

Etcd.prototype.initBackend = function(backend, cb) {
    this.redisClient.exists("frontend:" + backend.hostname, function(err, exists) {
        if (err) {
            return console.error(err);
        }
        if (!exists) {
            this.addBackend(backend, "foo", function() {
                if (cb) cb();
            });
        } else {
            if (cb) cb();
        }
    }.bind(this));
};

Etcd.prototype.getHostnameFromKey = function(key) {
    var path = key.replace(this.config.etcd.path, "").split(/\//);
    return {hostname: path[0], container: path[1]};
};

Etcd.prototype.watch = function() {
    var watcher = this.client.watcher(this.config.etcd.path, null, {recursive: true});
    watcher.on("change", function(change) {
        var backend = this.getHostnameFromKey(change.node.key);

        switch (change.action) {
        case "set":
            this.initBackend(backend, function() {
                this.addBackend(backend, change.node.value);
            }.bind(this));
            break;
        case "delete":
        case "expire":
            this.removeBackend(backend);
            break;
        default:
            this.getAll();
        }

    }.bind(this));
    watcher.on("error", console.error);
};

module.exports = Etcd;

