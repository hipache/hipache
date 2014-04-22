(function () {
    'use strict';

    var IDriver = require('../utils/idriver'),
        DriverError = require('../utils/drivererror'),
        // XXX new logging infrastructure not landed yet
        // logger = require('../logger'),
        util = require('util');

    try {
        var SubDriver = require('node-zookeeper-client');
    } catch (e) {
        // XXX new logging infrastructure not landed yet
        // logger.error('IDriver', 'You must use `npm install node-zookeeper-client` if you want to use this adapter');
        return;
    }

    var Zookeeper = function () {
        // Provides slave and master url properties
        IDriver.apply(this, arguments);

        var drivers = this.drivers.map(function (u) {
            // XXX new logging infrastructure not landed yet
            // if (u.auth) {
            //     logger.error('Zookeeper', 'This driver doesn\'t support authentication!!!');
            // }
            return (u.hostname || 'localhost') + ':' + (u.port || '2181');
        });
        // The principal client
        var clientReady = false;
        var client = new SubDriver.createClient(drivers[0]);
        client.connect();

        var prefix = '';
        if (this.drivers[0].hash) {
            prefix = '/' + this.drivers[0].hash.substr(1);
        }

        var connected = false;

        client.on('error', function (err) {
            // Re-emit unspecified error as is
            this.emit(this.ERROR, new DriverError(DriverError.UNSPECIFIED, err));
        }.bind(this));

        client.once('connected', function (err) {
            clientReady = true;
            this.emit(this.READY, err);
        }.bind(this));

        Object.defineProperty(this, 'connected', {
            get: function () {
                // XXX implement me!
                return clientReady;
            }
        });

        var sayErr = function (err) {
            connected = false;
            this.emit(this.ERROR, new DriverError(DriverError.UNSPECIFIED, err));
        }.bind(this);

        this.read = function (hosts, callback) {
            var result = [];
            var first = hosts[0];
            var lookup = function () {
                var host = hosts.shift();
                if (!host) {
                    client.getData(prefix + '/dead/' + first, null, function (error, data) {
                        if (error && error.getCode() !== SubDriver.Exception.NO_NODE) {
                            sayErr(error);
                            callback(error);
                            return;
                        }
                        var deads = [];
                        var deadNodes = JSON.parse(data ? data.toString() : '[]');
                        for (var i in deadNodes) {
                            var id = deadNodes[i][0];
                            var ttl = deadNodes[i][1];
                            if (Date.parse(ttl) > Date.now()) {
                                deads.push(id);
                            }
                            // XXX implement removing expired dead entries
                        }
                        result.push(deads);
                        callback(null, result);
                        return;
                    });
                    return;
                }
                client.getData(prefix + '/frontend/' + host, null, function (error, data) {
                    if (error && error.getCode() !== SubDriver.Exception.NO_NODE) {
                        sayErr(error);
                        callback(error);
                        return;
                    }
                    result.push(JSON.parse(data ? data.toString() : '[]'));
                    lookup();
                });
            };
            lookup();
        };

        this.create = function (host, vhost, callback) {
            var data = JSON.stringify([vhost]);
            client.remove(prefix + '/frontend/' + host, function ()  {
                client.mkdirp(prefix + '/frontend', null, function (error)  {
                    if (error) {
                        sayErr(error);
                        callback(error);
                        return;
                    }
                    client.create(prefix + '/frontend/' + host, new Buffer(data), function (error)  {
                        if (error) {
                            sayErr(error);
                            callback(error);
                            return;
                        }
                        callback(error, []);
                    });
                });
            });
        };

        this.add = function (host, backend, callback) {
            var path = prefix + '/frontend/' + host;
            client.getData(
                path,
                function (error, data) {
                    if (error) {
                        sayErr(error);
                        callback(error);
                        return;
                    }

                    data = JSON.parse(data.toString());
                    data.push(backend);

                    client.setData(path, new Buffer(JSON.stringify(data)), function (error) {
                        if (error) {
                            sayErr(error);
                            callback(error);
                            return;
                        }
                        callback(error, []);
                    });
                }
            );
        };

        this.mark = function (frontend, id, url, len, ttl, callback) {
            var path = prefix + '/dead/' + frontend;
            client.getData(
                path,
                function (error, data) {
                    if (error && error.getCode() !== SubDriver.Exception.NO_NODE) {
                        sayErr(error);
                        callback(error);
                        return;
                    }
                    data = JSON.parse(data ? data.toString() : '[]');
                    data.push([id, new Date(Date.now() + ttl * 1000)]);

                    if (error && error.getCode() === SubDriver.Exception.NO_NODE) {
                        client.mkdirp(prefix + '/dead', function (error) {
                            if (error) {
                                sayErr(error);
                                callback(error);
                                return;
                            }
                            client.create(path, new Buffer(JSON.stringify(data)), function (error) {
                                if (error) {
                                    sayErr(error);
                                    callback(error);
                                    return;
                                }
                                callback(error, []);
                            });
                        });
                    } else {
                        client.setData(path, new Buffer(JSON.stringify(data)), function (error) {
                            if (error) {
                                sayErr(error);
                                callback(error);
                                return;
                            }
                            callback(error, []);
                        });
                    }
                }
            );
        };

        this.destructor = function () {
            client.close();
        };
    };

    util.inherits(Zookeeper, IDriver);

    module.exports = Zookeeper;

})();
