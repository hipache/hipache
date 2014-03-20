(function () {
    /*globals describe:false, it:false, before:false, after:false*/
    'use strict';

    // XXX need to test standalone npm modules providing drivers

    var expect = require('chai').expect;

    var factory = require('../../lib/drivers/factory');

    var Server = require('../fixtures/servers/redis');

    var s1 = new Server();

    // Start a default server (will silently fail is there is one already
    before(function () {
        s1.start(['port 6379']);
    });

    // Shutdown
    after(function () {
        s1.stop();
    });

    describe('Driver factory', function () {
        ['redis:', 'memcached://', 'etcd://', 'etcds://', 'redis:///ß∞'].forEach(function (u) {
            it(u, function () {
                var driverInstance = factory.getDriver(u);
                var t = u.match(/^([a-z]+)/).pop();
                if (t !== 'redis') {
                    t = t.replace(/s$/, '');
                }
                var driverClass = require('../../lib/drivers/' + t);
                expect(driverInstance).to.be.an.instanceof(driverClass);
            });
        });

        it('unregistered-driver-class', function (done) {
            var handler = function () {
                done();
            };
            factory.once('error', handler);
            factory.getDriver('nopassaran://');
        });

        it('bogus url', function (done) {
            var handler = function () {
                done();
            };
            factory.once('error', handler);
            factory.getDriver('bogus');
        });

        it('broken driver', function (done) {
            var handler = function () {
                done();
            };
            factory.once('error', handler);
            factory.getDriver('drivertpl://');
        });

    });
})();
