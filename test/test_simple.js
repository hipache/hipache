
'use strict';

var http = require('http'),
    proxy = require('./proxy');


exports.simple = {

    setUp: function (callback) {
        proxy.setUp();
        this._server = http.createServer(function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('ok');
        });
        this._server.listen(6001);
        proxy.addFrontend('this.isa.test', ['http://localhost:6001']);
        // Wait for the server to be spawned
        setTimeout(callback, 500);
    },

    tearDown: function (callback) {
        proxy.removeMatchedFrontend('*isa.test');
        setTimeout(function () {
            proxy.tearDown();
            this._server.close();
            callback();
        }.bind(this), 500);
    },

    testProxy: function (test) {
        test.expect(3);
        proxy.requestFrontend(test, 'this.isa.test', 200);
        proxy.requestFrontend(test, 'pipo.isa.test', 400);
        proxy.requestFrontend(test, 'isa.test', 400, test.done);
    },

    testProxyBackendCrashed: function (test) {
        test.expect(1);
        proxy.addFrontend('crashed.isa.test', ['http://localhost:60042'], function () {
            proxy.requestFrontend(test, 'crashed.isa.test', 502, test.done);
        });
    },

    testProxyFrontendWildcard: function (test) {
        test.expect(3);
        // Adding domain wildcard
        proxy.addFrontend('*.isa.test', ['http://localhost:6001'], function () {
            proxy.requestFrontend(test, 'pipo.isa.test', 200);
            proxy.requestFrontend(test, 'isa.test', 400);
            proxy.requestFrontend(test, 'blah.pipo.isa.test', 200, test.done);
        });
    },

    testProxyPlainDomain: function (test) {
        test.expect(2);
        // Adding plain domain name
        proxy.addFrontend('isa.test', ['http://localhost:6001'], function () {
            proxy.requestFrontend(test, 'pipo.isa.test', 400);
            proxy.requestFrontend(test, 'isa.test', 200, test.done);
        });
    },

    testProxyFrontendWildcardPriority: function (test) {
        test.expect(3);
        proxy.addFrontend('*.isa.test', ['http://localhost:60042'], function () {
            proxy.addFrontend('isa.test', ['http://localhost:6001'], function () {
                proxy.requestFrontend(test, 'pipo.isa.test', 302);
                proxy.requestFrontend(test, 'isa.test', 200);
                proxy.requestFrontend(test, 'this.isa.test', 200, test.done);
            });
        });
    }

};
