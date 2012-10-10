
'use strict';

var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    httpProxy = require('http-proxy'),
    cache = require('./cache'),
    memoryMonitor = require('./memorymonitor');

var rootDir = fs.realpathSync(__dirname + '/../');

var logType = {
    log: 1,
    accessLog: 2
};

var log = function (msg, type) {
    // Send the log data to the master
    try {
        var message = {
            type: (type === undefined) ? logType.log : type,
            from: process.pid,
            data: msg
        };
        process.send(message);
    } catch (err) {
        // Cannot write on the master channel (worker is committing a suicide)
        // (from the memorymonitor), writing the log directly.
        if (message.type === 1) {
            util.log('(worker #' + message.from + ') ' + message.data);
        }
    }
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
    this.cache = cache(config, {
        logHandler: log,
        debugHandler: debug
    });
    this.runServer(config.server);
}

Worker.prototype.runServer = function (config) {
    httpProxy.setMaxSockets(config.maxSockets);

    var proxyErrorHandler = function (err, req, res) {
        if (err.code === 'ECONNREFUSED' ||
                err.code === 'ETIMEDOUT' ||
                req.error !== undefined) {
            // This backend is dead
            var backendId = req.meta.backendId;
            this.cache.markDeadBackend(req.meta.frontend, backendId);
            if (req.error) {
                err = req.error;
                // Clearing the error
                delete req.error;
            }
            log(req.headers.host + ': backend #' + backendId + ' is dead (' + JSON.stringify(err) + ') while handling request for ' + req.url);
        } else {
            log(req.headers.host + ': backend #' + req.meta.backendId + ' reported an error (' + JSON.stringify(err) + ') while handling request for ' + req.url);
        }
        req.retries = (req.retries === undefined) ? 0 : req.retries + 1;
        if (res.connection.destroyed === true) {
            // FIXME: When there is a TCP timeout, the socket of the Response
            // object is closed. Not possible to return a result after a retry.
            // BugID:5654
            log(req.headers.host + ': Response socket already closed, aborting.');
            return;
        }
        req.emit('retry');
    }.bind(this);

    var startHandler = function (req, res) {
        var remoteAddr = getRemoteAddress(req);

        // TCP timeout to 30 sec
        req.connection.setTimeout(config.tcpTimeout * 1000);
        // Make sure the listener won't be set again on retry
        if (req.connection.listeners('timeout').length < 2) {
            req.connection.once('timeout', function () {
                req.error = 'TCP timeout';
            });
        }

        // Set forwarded headers
        if (remoteAddr === null) {
            return errorMessage(res, 'Cannot read the remote address.');
        }
        if (remoteAddr.slice(0, 2) !== '::') {
            remoteAddr = '::ffff:' + remoteAddr;
        }
        // Play nicely when behind other proxies
        if (req.headers['x-forwarded-for'] === undefined) {
            req.headers['x-forwarded-for'] = remoteAddr;
        }
        if (req.headers['x-real-ip'] === undefined) {
            req.headers['x-real-ip'] = remoteAddr;
        }
        if (req.headers['x-forwarded-protocol'] === undefined) {
            req.headers['x-forwarded-protocol'] = req.connection.pair ? 'https' : 'http';
        }
        if (req.headers['x-forwarded-proto'] === undefined) {
            req.headers['x-forwarded-proto'] = req.connection.pair ? 'https' : 'http';
        }
        if (req.headers['x-forwarded-port'] === undefined) {
            // FIXME: replace by the real port instead of hardcoding it
            req.headers['x-forwarded-port'] = req.connection.pair ? '443' : '80';
        }
    };

    var getRemoteAddress = function (req) {
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

    var errorMessage = function (res, message, code) {
        if (message === undefined) {
            message = '';
        }
        code = isNaN(code) ? 400 : parseInt(code, 10);

        var staticPath = function (name) {
            return rootDir + '/static/error_' + name + '.html';
        };

        var serve = function (filePath) {
            var stream = fs.createReadStream(filePath);
            var headers = {
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

        var errorPage = staticPath(code);
        fs.exists(errorPage, function (exists) {
            if (exists === true) {
                return serve(errorPage);
            }
            errorPage = staticPath('default');
            fs.exists(errorPage, function (exists) {
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

    var getDomainName = function (hostname) {
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

    var httpRequestHandler = function (req, res) {
        res.timer = {
            start: (new Date()).getTime()
        };

        // Patch the response object
        (function () {
            // Enable debug?
            res.debug = (req.headers['x-debug'] !== undefined);
            // Patch res.writeHead to return debug headers
            if (res.debug === true) {
                var resWriteHead = res.writeHead;
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
            var resEnd = res.end;
            res.end = function () {
                resEnd.apply(res, arguments);
                // Number of bytes written on the client socket
                var socketBytesWritten = req.connection ? req.connection._bytesDispatched : 0;
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

        // Proxy the HTTP request
        var proxyRequest = function () {
            var buffer = httpProxy.buffer(req);

            this.cache.getBackendFromHostHeader(req.headers.host, function (err, code, backend) {
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
                    },
                    enable: {
                        xforward: false
                    }
                });
                proxy.on('proxyError', proxyErrorHandler);
                proxy.on('start', startHandler);
                proxy.proxyRequest(req, res, buffer);
            });
        }.bind(this);
        req.on('retry', function () {
            log('Retrying on ' + req.headers.host);
            if (req.retries > config.errorMaxRetries) {
                log(req.headers.host + ': Retried too many times, aborting.');
                return errorMessage(res, 'Reached max retries limit', 502);
            }
            proxyRequest();
        });
        proxyRequest();
    }.bind(this);

    var wsRequestHandler = function (req, socket, head) {
        var buffer = httpProxy.buffer(socket);

        this.cache.getBackendFromHostHeader(req.headers.host, function (err, code, backend) {
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
    }.bind(this);

    var monitor = memoryMonitor({
        logHandler: log
    });

    // Ipv4
    var ipv4HttpServer = http.createServer(httpRequestHandler);
    ipv4HttpServer.on('upgrade', wsRequestHandler);
    ipv4HttpServer.listen(config.port);

    // Ipv6
    var ipv6HttpServer = http.createServer(httpRequestHandler);
    ipv6HttpServer.on('upgrade', wsRequestHandler);
    ipv6HttpServer.listen(config.port, '::1');

    monitor.addServer(ipv4HttpServer);
    monitor.addServer(ipv6HttpServer);

    if (config.https) {
        var options = config.https;
        options.key = fs.readFileSync(options.key, 'utf8');
        options.cert = fs.readFileSync(options.cert, 'utf8');

        var ipv4HttpsServer = https.createServer(options, httpRequestHandler);
        ipv4HttpsServer.on('upgrade', wsRequestHandler);
        ipv4HttpsServer.listen(config.https.port);

        var ipv6HttpsServer = https.createServer(options, httpRequestHandler);
        ipv6HttpsServer.on('upgrade', wsRequestHandler);
        ipv6HttpsServer.listen(config.https.port, '::1');

        monitor.addServer(ipv4HttpsServer);
        monitor.addServer(ipv6HttpsServer);
    }
};

module.exports = Worker;
