'use strict';

var Client = require('node-etcd'),
    redis = require('redis'),
    util = require('util');

function Etcd(config) {
    if (!(this instanceof Etcd)) {
        return new Etcd(config);
    }

    this.config = config;

    // Configure Redis
    this.redisClient = redis.createClient(
        this.config.redisPort,
        this.config.redisHost
    );

    //select database
    if (this.config.redisDatabase) {
        this.redisClient.select(this.config.redisDatabase);
    }

    //auth redis
    if (this.config.redisPassword) {
        this.redisClient.auth(this.config.redisPassword);
    }

    this.redisClient.on('error', function (err) {
        console.error('RedisError ' + err);
    }.bind(this));

    // configure etcd
    this.client = new Client(this.config.etcdHost, this.config.etcdPort);

    this.getAll(function(err) {
      if (err) {
          console.error(err);
          process.exit(1);
      }
      this.watch();
    }.bind(this));
};

Etcd.prototype.initialize = function(cb) {
    this.client.mkdir(this.config.etcdPath, function(err) {
        if (err) {
            return cb(err);
        }
        if (cb) cb();
    }.bind(this));
};

Etcd.prototype.getAll = function(cb) {
    this.client.get(this.config.etcdPath, { recursive: true }, function(err, data) {
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
                    var hostname = node.key.replace(this.config.etcdPath, '')
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
    console.log("rpush", "frontend:" + backend.hostname, url);
    console.log("hset", "backendmapping", backend.container, url);
    this.redisClient.rpush("frontend:" + backend.hostname, url, function() {
        this.redisClient.hset("backendmapping", backend.container, url, function() {
            if (cb) cb();
        });
    }.bind(this));
};

Etcd.prototype.removeBackend = function(backend) {
    console.log("hget", "backendmapping", backend.container);
    this.redisClient.hget("backendmapping", backend.container, function(err, url) {
        if (err) {
            return console.error(err);
        }
        console.log("lrem", "frontend:" + backend.hostname, 0, url);
        console.log("hdel", "backendmapping", backend.container);
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
    var path = key.replace(this.config.etcdPath, "").split(/\//);
    return {hostname: path[0], container: path[1]};
};

Etcd.prototype.watch = function() {
    var watcher = this.client.watcher(this.config.etcdPath, null, {recursive: true});
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

