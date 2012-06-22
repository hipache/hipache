
'use strict';

var fs = require('fs'),
    path = require('path'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    redis = require('redis'),
    httpProxy = require('http-proxy'),
    memoryMonitor = require('./memorymonitor');

var rootDir = fs.realpathSync(__dirname + '/../');

var logType = {
    log: 1,
    accessLog: 2
};

var log = function (msg, type) {
    // Send the log data to the master
    process.send({
        type: (type === undefined) ? logType.log : type,
        from: process.env.NODE_WORKER_ID || process.pid,
        data: msg
    });
};

var debug = function (debugMode) {
    return function (msg) {
        if (debugMode !== true) {
            return;
        }
        log(msg, logType.log);
    };
};

// Ignore SIGUSR
process.on('SIGUSR1', function () {});
process.on('SIGUSR2', function () {});


function Worker(config) {
    if (!(this instanceof Worker)) {
        return new Worker(config);
    }

    debug = debug(config.server.debug);
    // Configure Redis
    redis = redis.createClient(config.redis.port, config.redis.host);
    redis.on('error', function (err) {
        log('RedisError ' + err);
    });

    process.on('exit', function () {
        log('Terminating worker (#' + process.pid + ')');
    });
    this.runServer(config.server);
}

Worker.prototype.runServer = function (config) {
    var proxyErrorHandler,
        startHandler,
        getRemoteAddress,
        errorMessage,
        getDomainName,
        getBackendFromHostHeader,
        httpRequestHandler,
        wsRequestHandler,
        monitor,
        ipv4HttpServer,
        ipv4HttpsServer,
        ipv6HttpServer,
        ipv6HttpsServer,
        options;

    httpProxy.setMaxSockets(config.maxSockets);

    proxyErrorHandler = function (err, req, res) {
        var frontendKey,
            backendId,
            multi;

        /*
           FIXME: Apparently tagging backend as dead with one of this error is wrong
            err.code === 'ECONNRESET' ||
            err.bytesParsed !== undefined) // HTTP parse error
        */
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
            // Store the dead backend ID
            frontendKey = 'dead:' + req.meta.frontend;
            backendId = req.meta.backendId;
            multi = redis.multi();
            multi.sadd(frontendKey, backendId);
            multi.expire(frontendKey, config.deadBackendTTL);
            multi.exec();
            log(req.headers.host + ': backend #' + backendId + ' is dead (' + JSON.stringify(err) + ').');
        } else {
            log(req.headers.host + ': backend #' + req.meta.backendId + ' reported an error (' + JSON.stringify(err) + ').');
        }
        // Redirects the client to the same URL to let it retry
        // TODO: the request can probably be replayed on the server-side
        // instead of letting the client replay the request itself
        if (res.debug === true) {
            return; // FIXME: cannot raise a retry if debug is enabled (double writeHead)
        }
        res.writeHead(302, {
            'location': req.headers['x-forwarded-proto'] + '://' +
                req.headers.host + req.url
        });
        res.end();
    };

    startHandler = function (req, res) {
        var remoteAddr = getRemoteAddress(req);

        // Set forwarded headers
        if (remoteAddr === null) {
            return errorMessage(res, 'Cannot read the remote address.');
        }
        if (remoteAddr.slice(0, 2) !== '::') {
            remoteAddr = '::ffff:' + remoteAddr;
        }
        req.headers['x-real-ip'] = remoteAddr;
        req.headers['x-forwarded-for'] = remoteAddr;
        req.headers['x-forwarded-protocol'] = req.connection.pair ? 'https' : 'http';
        req.headers['x-forwarded-port'] = req.connection.pair ? '443' : '80';
    };

    getRemoteAddress = function (req) {
        if (req.connection === undefined) {
            return null;
        }
        if (req.connection.remoteAddress) {
            return req.connection.remoteAddress;
        }
        if (req.connection.socket && req.connection.socket.remoteAddress) {
            return req.connection.socket.remoteAddress;
        }
        return null;
    };

    errorMessage = function (res, message, code) {
        var staticPath,
            serve,
            errorPage;

        if (message === undefined) {
            message = '';
        }
        code = isNaN(code) ? 400 : parseInt(code, 10);

        staticPath = function (name) {
            return rootDir + '/static/error_' + name + '.html';
        };

        serve = function (filePath) {
            var stream,
                headers;

            stream = fs.createReadStream(filePath);
            headers = {
                'content-type': 'text/html'
            };
            if (res.debug === true) {
                headers['x-debug-error'] = message;
            }
            res.writeHead(code, headers);
            stream.on('data', function (data) {
                res.write(data);
            });
            stream.on('error', function () {
                res.end();
            });
            stream.on('end', function () {
                res.end();
            });
        };

        errorPage = staticPath(code);
        path.exists(errorPage, function (exists) {
            if (exists === true) {
                return serve(errorPage);
            }
            errorPage = staticPath('default');
            path.exists(errorPage, function (exists) {
                var headers;

                if (exists === true) {
                    return serve(errorPage);
                }
                headers = {
                    'content-length': message.length,
                    'content-type': 'text/html'
                };
                if (res.debug === true) {
                    headers['x-debug-error'] = message;
                }
                res.writeHead(code, headers);
                res.write(message);
                res.end();
            });
        });
    };

    getDomainName = function (hostname) {
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

    getBackendFromHostHeader = function (host, callback) {
        var index,
            multi;

        if (host === undefined) {
            return callback('no host header', 400);
        }
        index = host.indexOf(':');
        if (index > 0) {
            host = host.slice(0, index).toLowerCase();
        }
        multi = redis.multi();
        multi.lrange('frontend:' + host, 0, -1);
        multi.lrange('frontend:*' + getDomainName(host), 0, -1);
        multi.smembers('dead:' + host);
        multi.exec(function (err, rows) {
            var backends,
                deads,
                virtualHost,
                index,
                backend;

            backends = rows[0];
            if (backends.length === 0) {
                backends = rows[1];
            }
            deads = rows[2];
            if (backends.length === 0) {
                return callback('frontend not found', 400);
            }
            virtualHost = backends.shift();
            index = (function () {
                // Pickup a random backend index
                var indexes = [],
                    i;

                for (i = 0; i < backends.length; i += 1) {
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
            backend = url.parse(backends[index]);
            backend.id = index; // Store the backend index
            backend.frontend = host; // Store the associated frontend
            backend.virtualHost = virtualHost; // Store the associated vhost
            if (backend.hostname === undefined) {
                return callback('backend is invalid', 502);
            }
            backend.port = (backend.port === undefined) ? 80 : parseInt(backend.port, 10);
            debug('Proxying: ' + host + ' -> ' + backend.hostname + ':' + backend.port);
            callback(false, 0, backend);
        });
    };

    httpRequestHandler = function (req, res) {
        var buffer = httpProxy.buffer(req);

        res.timer = {
            start: (new Date()).getTime()
        };

        // Patch the response object
        (function () {
            var resWriteHead,
                resEnd,
                socketBytesWritten;

            // Enable debug?
            res.debug = (req.headers['x-debug'] === undefined) ? false : true;
            // Patch res.writeHead to return debug headers
            if (res.debug === true) {
                resWriteHead = res.writeHead;
                res.writeHead = function () {
                    res.timer.end = (new Date()).getTime();
                    if (req.meta === undefined) {
                        return resWriteHead.apply(res, arguments);
                    }
                    res.setHeader('x-debug-backend-url', req.meta.backendUrl);
                    res.setHeader('x-debug-backend-id', req.meta.backendId);
                    res.setHeader('x-debug-vhost', req.meta.virtualHost);
                    res.setHeader('x-debug-frontend-key', req.meta.frontend);
                    res.setHeader('x-debug-time-total', (res.timer.end - res.timer.start));
                    res.setHeader('x-debug-time-backend', (res.timer.end - res.timer.startBackend));
                    return resWriteHead.apply(res, arguments);
                };
            }
            // Patch res.end to log the response stats
            resEnd = res.end;
            res.end = function () {
                resEnd.apply(res, arguments);
                socketBytesWritten = res.socket ? res.socket.bytesWritten : 0;
                if (req.meta === undefined ||
                        req.headers['x-real-ip'] === undefined) {
                    return; // Nothing to log
                }
                if (res.timer.end === undefined) {
                    res.timer.end = (new Date()).getTime();
                }
                // Log the request
                log({
                    remoteAddr: req.headers['x-real-ip'],
                    currentTime: res.timer.start,
                    totalTimeSpent: (res.timer.end - res.timer.start),
                    backendTimeSpent: (res.timer.end - res.timer.startBackend),
                    method: req.method,
                    url: req.url,
                    httpVersion: req.httpVersion,
                    statusCode: res.statusCode,
                    socketBytesWritten: socketBytesWritten,
                    referer: req.headers.referer,
                    userAgent: req.headers['user-agent'],
                    virtualHost: req.meta.virtualHost
                }, logType.accessLog);
            };
        }());

        getBackendFromHostHeader(req.headers.host, function (err, code, backend) {
            if (err) {
                return errorMessage(res, err, code);
            }
            req.meta = {
                backendId: backend.id,
                frontend: backend.frontend,
                virtualHost: backend.virtualHost,
                backendUrl: backend.href
            };
            // Proxy the request to the backend
            res.timer.startBackend = (new Date()).getTime();
            var proxy = new httpProxy.HttpProxy({
                target: {
                    host: backend.hostname,
                    port: backend.port
                }
            });
            proxy.on('proxyError', proxyErrorHandler);
            proxy.on('start', startHandler);
            proxy.proxyRequest(req, res, buffer);
        });
    };

    wsRequestHandler = function (req, socket, head) {
        var buffer = httpProxy.buffer(socket);

        getBackendFromHostHeader(req.headers.host, function (err, code, backend) {
            var proxy;

            if (err) {
                log('proxyWebSocketRequest: ' + err);
                return;
            }
            // Proxy the WebSocket request to the backend
            proxy = new httpProxy.HttpProxy({
                target: {
                    host: backend.hostname,
                    port: backend.port
                }
            });
            proxy.proxyWebSocketRequest(req, socket, head, buffer);
        });
    };

    monitor = memoryMonitor({
        logHandler: log
    });

    // Ipv4
    ipv4HttpServer = http.createServer(httpRequestHandler);
    ipv4HttpServer.on('upgrade', wsRequestHandler);
    ipv4HttpServer.listen(config.port);

    // Ipv6
    ipv6HttpServer = http.createServer(httpRequestHandler);
    ipv6HttpServer.on('upgrade', wsRequestHandler);
    ipv6HttpServer.listen(config.port, '::1');

    monitor.addServer(ipv4HttpServer);
    monitor.addServer(ipv6HttpServer);

    if (config.https) {
        options = config.https;
        options.key = fs.readFileSync(options.key, 'utf8');
        options.cert = fs.readFileSync(options.cert, 'utf8');

        ipv4HttpsServer = https.createServer(options, httpRequestHandler);
        ipv4HttpsServer.on('upgrade', wsRequestHandler);
        ipv4HttpsServer.listen(config.https.port);

        ipv6HttpsServer = https.createServer(options, httpRequestHandler);
        ipv6HttpsServer.on('upgrade', wsRequestHandler);
        ipv6HttpsServer.listen(config.https.port, '::1');

        monitor.addServer(ipv4HttpsServer);
        monitor.addServer(ipv6HttpsServer);
    }
};

module.exports = Worker;
