(function () {
    'use strict';

    var WebSocketServer = require('ws').Server;
    var connect = require('connect');
    var http = require('http');

    var RedisServer = require('./servers/redis');
    var HipacheServer = require('./servers/hipache');

    // var redis = require('redis');

    // , wss;//, hp;

    // Start a redis
    // Start a ws server
    // Provision the backend
    var Commander = function () {
        var servers = [];

        this.startRedis = function (config, callback) {
            config = config || 'port 7777';
            var s = new RedisServer();
            s.start(config).once('started', callback || function () {});
            servers.push(s);
        };

        this.startHipache = function (config, callback) {
            config = config || 'test/fixtures/configs/hipache-config.json';
            var s = new HipacheServer();
            s.start(config).once('started', callback || function () {});
            servers.push(s);
        };

        this.startWs = function (port) {
            var ws = new WebSocketServer({port: port});

            ws.on('open', function () {
                ws.send('pong:open');
            });

            ws.on('connection', function (ws) {
                ws.on('message', function (message) {
                    ws.send('pong:message:' + message);
                });
                ws.send('pong:connection');
            });
            return ws;
        };

        this.startHttp = function (port, middleware) {
            var app = connect().use(middleware);
            var s = http.createServer(app);
            s.listen(port);
            return s;
        };

        this.stopAll = function (callback) {
            if (!servers.length) {
                if (callback) {
                    callback();
                }
                return;
            }
            servers.shift().stop().once('stopped', this.stopAll.bind(this, callback));
        };

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
