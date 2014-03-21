(function () {
    /*globals describe:false, it:false*/
    'use strict';

    // XXX need to test standalone npm modules providing drivers

    var expect = require('chai').expect;

    var factory = require('../../lib/drivers/factory');
    var idriver = require('../../lib/drivers/ihipdriver');

    describe('Driver factory', function () {
        ['redis:', 'memcached://', 'etcd:', 'etcds://', 'redis:///ß∞'].forEach(function (u) {
            it(u, function () {
                var t = u.match(/^([a-z]+)/).pop();
                if (t !== 'redis') {
                    t = t.replace(/s$/, '');
                }
                var driverClass = require('../../lib/drivers/' + t);

                var driverInstance = factory.getDriver(u);
                driverInstance.once('error', function () {
                    driverInstance.destructor();
                });
                driverInstance.once('ready', function () {
                    driverInstance.destructor();
                });

                expect(driverInstance).to.be.an.instanceof(driverClass);
                expect(driverInstance).to.be.an.instanceof(idriver);
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
