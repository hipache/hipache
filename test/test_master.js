
'use strict';

var fs = require('fs'),
    assert = require('assert'),
    master = require('../lib/master');

describe('Master', function () {

    var config = {
        "server": {
            "debug": true,
            "accessLog": "/tmp/hipache-test-access.log",
            "port": 1080,
            "workers": 2,
            "maxSockets": 100,
            "deadBackendTTL": 30,
            "tcpTimeout": 5,
            "retryOnError": 0,
            "deadBackendOn500": true,
            "httpKeepAlive": false
        }
    };

    before(function () {
        var logFile = config.server.accessLog;

        if (fs.existsSync(logFile)) {
            fs.unlinkSync(config.server.accessLog);
        }
    });

    describe('#accessLog(data)', function () {

        it('should match the expected output after parsing', function (done) {
            var m = master(config);

            var data = {
                remoteAddr: '::1',
                currentTime: 1392511390963,
                totalTimeSpent: 11,
                backendTimeSpent: 9,
                method: 'GET',
                url: '/',
                httpVersion: '1.1',
                statusCode: 200,
                socketBytesWritten: 3236,
                userAgent: 'curl/7.30.0',
                virtualHost: 'mywebsite'
            };
            m.accessLog(data);
            var expectedLine = '::1 - - [16/Feb/2014:00:43:10 +0000] ';
            expectedLine += '"GET / HTTP/1.1" 200 3236 "" "curl/7.30.0" ';
            expectedLine += '"mywebsite" 0.011 0.009\n';
            fs.readFile(config.server.accessLog, 'utf8', function (err, data) {
                if (err) {
                    throw err;
                }
                assert.equal(data, expectedLine);
                done();
            });
        });
    });

});
