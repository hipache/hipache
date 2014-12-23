
'use strict';

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    http = require('http'),
    https = require('https'),
    httpProxy = require('http-proxy'),
    cache = require('./cache'),
    memoryMonitor = require('./memorymonitor');

var rootDir = fs.realpathSync(__dirname + '/../');

var hipacheVersion = require(path.join(__dirname, '..', 'package.json')).version;

var logType = {
    log: 1,
    accessLog: 2
};

var log = function (msg, type) {
    // Send the log data to the master
    var message = {};
    try {
        message = {
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
    this.config = config;
}

Worker.prototype.run = function () {
    this.runServer(this.config);
};

Worker.prototype.runServer = function (config) {
    var options = {};
    if (config.server.httpKeepAlive !== true) {
        // Disable the http Agent of the http-proxy library so we force
        // the proxy to close the connection after each request to the backend
        options.agent = false;
    }
    var proxy = httpProxy.createProxyServer(options);
    http.globalAgent.maxSockets = config.server.maxSockets;
    https.globalAgent.maxSockets = config.server.maxSockets;

    // Handler called when an error is triggered while proxying a request
    var proxyErrorHandler = function (err, req, res) {
        if (err.code === 'ECONNREFUSED' ||
                err.code === 'ETIMEDOUT' ||
                req.error !== undefined) {
            // This backend is dead
            var backendId = req.meta.backendId;
            if (req.meta.backendLen > 1) {
                this.cache.markDeadBackend(req.meta);
            }
            if (req.error) {
                err = req.error;
                // Clearing the error
                delete req.error;
            }
            log(req.headers.host + ': backend #' + backendId + ' is dead (' + JSON.stringify(err) +
                ') while handling request for ' + req.url);
        } else {
            log(req.headers.host + ': backend #' + req.meta.backendId + ' reported an error (' +
                JSON.stringify(err) + ') while handling request for ' + req.url);
        }
        req.retries = (req.retries === undefined) ? 0 : req.retries + 1;
        if (!res.connection || res.connection.destroyed === true) {
            // FIXME: When there is a TCP timeout, the socket of the Response
            // object is closed. Not possible to return a result after a retry.
            // BugID:5654
            log(req.headers.host + ': Response socket already closed, aborting.');
            try {
                return errorMessage(res, 'Cannot retry on error', 502);
            } catch (err) {
                // Even if the client socket is closed, we return an error
                // to force calling a res.end(). We do it safely in case there
                // is an error
                log(req.headers.host + ': Cannot end the request properly (' + err + ').');
            }
        }
        if (req.retries >= config.server.retryOnError) {
            if (config.server.retryOnError) {
                log(req.headers.host + ': Retry limit reached (' + config.server.retryOnError + '), aborting.');
                return errorMessage(res, 'Reached max retries limit', 502);
            }
            return errorMessage(res, 'Retry on error is disabled', 502);
        }
        req.emit('retry');
    }.bind(this);

    // Handler called at the begining of the proxying
    var startHandler = function (req, res) {
        var remoteAddr = getRemoteAddress(req);

        // TCP timeout to 30 sec
        req.connection.setTimeout(config.server.tcpTimeout * 1000);
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

    var staticDir = config.server.staticDir || [ rootDir, 'static' ].join('/');

    var errorMessage = function (res, message, code) {
        // Flag the Response to know that it's an internal error message
        res.errorMessage = true;
        if (message === undefined) {
            message = '';
        }
        code = isNaN(code) ? 400 : parseInt(code, 10);

        var staticPath = function (name) {
            return [ staticDir, '/', 'error_', name, '.html' ].join('');
        };

        var serveFile = function (filePath) {
            var stream = fs.createReadStream(filePath);
            var headers = {
                'content-type': 'text/html',
                'cache-control': 'no-cache',
                'pragma': 'no-cache',
                'expires': '-1'
            };
            if (res.debug === true) {
                headers['x-debug-error'] = message;
                headers['x-debug-version-hipache'] = hipacheVersion;
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

        var serveText = function () {
            var headers = {
                'content-length': message.length,
                'content-type': 'text/plain',
                'cache-control': 'no-cache',
                'pragma': 'no-cache',
                'expires': '-1'
            };
            if (res.debug === true) {
                headers['x-debug-error'] = message;
                headers['x-debug-version-hipache'] = hipacheVersion;
            }
            res.writeHead(code, headers);
            res.write(message);
            res.end();
        };

        if (code === 200) {
            // If code is 200, let's just serve the text message since
            // it's not an error...
            return serveText(message);
        }

        var errorPage = staticPath(code);
        fs.exists(errorPage, function (exists) {
            if (exists === true) {
                return serveFile(errorPage);
            }
            errorPage = staticPath('default');
            fs.exists(errorPage, function (exists) {
                if (exists === true) {
                    return serveFile(errorPage);
                }
                return serveText();
            });
        });
    };

    var httpRequestHandler = function (req, res) {
        res.timer = {
            start: Date.now()
        };

        // Patch the response object
        (function () {
            // Enable debug?
            res.debug = (req.headers['x-debug'] !== undefined);
            // Patch the res.writeHead to detect backend HTTP errors and handle
            // debug headers
            var resWriteHead = res.writeHead;
            res.writeHead = function (statusCode) {
                if (res.sentHeaders === true) {
                    // In case of errors when streaming the backend response,
                    // we can resend the headers when raising an error.
                    return;
                }
                res.sentHeaders = true;
                res.timer.end = Date.now();
                if (req.meta === undefined) {
                    return resWriteHead.apply(res, arguments);
                }
                var markDeadBackend = function () {
                    var backendId = req.meta.backendId;
                    if (req.meta.backendLen > 1) {
                        this.cache.markDeadBackend(req.meta);
                    }
                    log(req.headers.host + ': backend #' + backendId + ' is dead (HTTP error code ' +
                            statusCode + ') while handling request for ' + req.url);
                }.bind(this);
                // If the HTTP status code is 5xx, let's mark the backend as dead
                // We consider the 500 as critical errors only if the setting "deadBackendOn500" is enabled
                // and only if the active health checks are running.
                var startErrorCode = (config.server.deadBackendOn500 === true &&
                    this.cache.passiveCheck === false) ? 500 : 501;
                if ((statusCode >= startErrorCode && statusCode < 600) && res.errorMessage !== true) {
                    if (statusCode === 503) {
                        var headers = arguments[arguments.length - 1];
                        if (typeof headers === 'object') {
                            // Let's lookup the headers to find a "Retry-After"
                            // In this case, this is a legit maintenance mode
                            if (headers['retry-after'] === undefined) {
                                markDeadBackend();
                            }
                        }
                    } else {
                        // For all other cases, mark the backend as dead
                        markDeadBackend();
                    }
                }
                // If debug is enabled, let's inject the debug headers
                if (res.debug === true) {
                    res.setHeader('x-debug-version-hipache', hipacheVersion);
                    res.setHeader('x-debug-backend-url', req.meta.backendUrl);
                    res.setHeader('x-debug-backend-id', req.meta.backendId);
                    res.setHeader('x-debug-vhost', req.meta.virtualHost);
                    res.setHeader('x-debug-frontend-key', req.meta.frontend);
                    res.setHeader('x-debug-time-total', (res.timer.end - res.timer.start));
                    res.setHeader('x-debug-time-backend', (res.timer.end - res.timer.startBackend));
                }
                return resWriteHead.apply(res, arguments);
            }.bind(this);
            // Patch res.end to log the response stats
            var resEnd = res.end;
            res.end = function () {
                resEnd.apply(res, arguments);
                // Number of bytes written on the client socket
                var socketBytesWritten = req.connection ? req.connection.bytesWritten : 0;
                if (req.meta === undefined ||
                        req.headers['x-real-ip'] === undefined) {
                    return; // Nothing to log
                }
                res.timer.end = Date.now();
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
        }.bind(this)());

        // Proxy the HTTP request
        var proxyRequest = function () {
            this.cache.getBackendFromHostHeader(req.headers.host, function (err, code, backend) {
                if (err) {
                    return errorMessage(res, err, code);
                }
                req.meta = {
                    backendId: backend.id,
                    backendLen: backend.len,
                    frontend: backend.frontend,
                    virtualHost: backend.virtualHost,
                    backendUrl: backend.href
                };
                // Proxy the request to the backend
                res.timer.startBackend = Date.now();
                proxy.emit('start', req, res);
                proxy.web(req, res, {
                    target: {
                        host: backend.hostname,
                        port: backend.port
                    },
                    xfwd: false
                });
            });
        }.bind(this);
        // Configure the retryOnError
        if (config.server.retryOnError) {
            req.on('retry', function () {
                log('Retrying on ' + req.headers.host);
                proxyRequest();
            });
        }
        proxyRequest();
    }.bind(this);

    var wsRequestHandler = function (req, socket, head) {
        this.cache.getBackendFromHostHeader(req.headers.host, function (err, code, backend) {
            if (err) {
                log('proxyWebSocketRequest: ' + err);
                return;
            }
            // Proxy the WebSocket request to the backend
            proxy.ws(req, socket, head, {
                target: {
                    host: backend.hostname,
                    port: backend.port
                }
            });
        });
    }.bind(this);

    var monitor = memoryMonitor({
        logHandler: log
    });

    // The handler configure the client socket for every new connection
    var tcpConnectionHandler = function (connection) {
        var remoteAddress = connection.remoteAddress,
            remotePort = connection.remotePort,
            start = Date.now();

        var getSocketInfo = function () {
            return JSON.stringify({
                remoteAddress: remoteAddress,
                remotePort: remotePort,
                bytesWritten: connection.bytesWritten,
                bytesRead: connection.bytesRead,
                elapsed: (Date.now() - start) / 1000
            });
        };

        connection.setKeepAlive(false);
        connection.setTimeout(config.server.tcpTimeout * 1000);
        connection.on('error', function (error) {
            log('TCP error from ' + getSocketInfo() + '; Error: ' + JSON.stringify(error));
        });
        connection.on('timeout', function () {
            log('TCP timeout from ' + getSocketInfo());
            connection.destroy();
        });
    };

    // Set proxy handlers
    proxy.on('error', proxyErrorHandler);
    proxy.on('start', startHandler);

    var counter = 0;
    var dropPrivileges = function () {
        counter--;
        // Every bind is in, we run as root, and we are asked to run as something else
        if (!counter && (process.getuid() === 0) && config.user && (config.user !== 0)) {
            log('Dropping privileges to ' + config.user + ':' + (config.group || config.user));
            process.setgid(config.group || config.user);
            process.setuid(config.user);
        }
    };

    // Servers creation
    config.http.bind.forEach(function (options) {
        counter++;
        var httpServer = http.createServer(httpRequestHandler);
        httpServer.on('connection', tcpConnectionHandler);
        httpServer.on('upgrade', wsRequestHandler);
        httpServer.listen(options.port, options.address);
        monitor.addServer(httpServer);
        httpServer.once('listening', dropPrivileges);
        log('Started HTTP server on ' + options.address + ' ' + options.port);
    });

    config.https.bind.forEach(function (options) {
        counter++;
        var httpsServer = https.createServer(options, httpRequestHandler);
        httpsServer.on('connection', tcpConnectionHandler);
        httpsServer.on('upgrade', wsRequestHandler);
        httpsServer.listen(options.port, options.address);
        monitor.addServer(httpsServer);
        httpsServer.once('listening', dropPrivileges);
        log('Started HTTPs server on ' + options.address + ' ' + options.port);
    });
};

module.exports = Worker;
