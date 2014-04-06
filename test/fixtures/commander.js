(function () {
    'use strict';

    // var WebSocketServer = require('ws').Server;
    var connect = require('connect');
    var http = require('http');

    var RedisServer = require('./servers/redis');
    var HipacheServer = require('./servers/hipache');
    var redis = require('redis');

    // , wss;//, hp;

    // Start a redis
    // Start a ws server
    // Provision the backend
    var Commander = function () {
        var servers = [];

        var start = function (server, config, callback) {
            server.once('started', callback || function () {});
            server.once('stopped', function () {
                servers.splice(servers.indexOf(server), 1);
            });
            servers.push(server);
            server.start(config);
        };

        var stop = function (server, callback) {
            server.once('stopped', callback || function () {});
            server.stop();
        };

        this.redis = new (function () {
            var red;
            var driver;

            this.start = function (config, callback) {
                red = new RedisServer();
                config = config || 'port 7777';
                start(red, config, callback);
                red.once('started', function () {
                    driver = redis.createClient(config.match(/port ([0-9]+)/).pop(), '127.0.0.1');
                    driver.on('error', function () {

                    });
                });
                red.once('stopped', function () {
                    if (driver) {
                        driver.end();
                    }
                });
            };

            this.hack = function () {
                // Force driver end
                driver.end();
                driver = null;
            };

            this.stop = function (callback) {
                red.once('stopped', callback || function () {});
                red.stop();
            };

            this.declare = function (hostname, backends, callback) {
                // Alt-syntax: [name, back1, back2], callback
                if (hostname instanceof Array) {
                    callback = backends;
                    backends = hostname;
                    hostname = backends.shift();
                }
                if (!(backends instanceof Array)) {
                    backends = [backends];
                }
                backends.unshift(hostname);
                backends.unshift('frontend:' + hostname);
                driver.rpush(backends, callback);
            };

            this.show = function (host, callback) {
                var m = driver.multi();
                m.lrange('frontend:' + host, 0, -1);
                m.exec(callback);
            };

            this.flush = function (callback) {
                driver.flushdb(callback);
            };
        })();

        this.hipache = new (function () {
            this.start = function (config, callback) {
                // Hipache needs quite some time to get of the ground, and we lack a signal...
                start(new HipacheServer(), config || 'test/fixtures/configs/hipache-config.json', function () {
                    if (callback) {
                        setTimeout(callback, 1500);
                    }
                });
            };
        })();

        this.startHttp = function (config, callback) {
            var s = http.createServer(connect().use(config.middleware));

            s.stop = s.close.bind(s, function () {
                s.emit('stopped');
            });

            s.start = function (port) {
                this.listen(port);
                this.emit('started');
            };

            start(s, config.port, callback);
        };

        var stopAll = this.stopAll = function (callback) {
            if (!servers.length) {
                if (callback) {
                    callback();
                }
                return;
            }
            stop(servers[0], function () {
                stopAll(callback);
            });
        };


        // this.startWs = function (port) {
        //     var ws = new WebSocketServer({port: port});

        //     ws.on('open', function () {
        //         ws.send('pong:open');
        //     });

        //     ws.on('connection', function (ws) {
        //         ws.on('message', function (message) {
        //             ws.send('pong:message:' + message);
        //         });
        //         ws.send('pong:connection');
        //     });
        //     return ws;
        // };



        // this.start = function () {
        //     // Redis

        //     redis = redis.createClient(7777);
        //     redis.rpush('frontend:127.0.0.1:8000 127.0.0.1:9000');

        //     // Hipache
        //     // hp = new HipacheServer();
        //     // hp.start();

            // Websock backend
        // };
    };

    module.exports = new Commander();
})();
