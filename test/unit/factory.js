(function () {
    /*globals describe:false, it:false*/
    'use strict';

    var expect = require('chai').expect;

    var factory = require('../../lib/drivers/factory');
    var idriver = require('../../lib/utils/idriver');
    var DriverError = require('../../lib/utils/drivererror');

    describe('Driver factory', function () {
        describe('#existing-drivers', function () {
            [
                ['redis:'], ['memcached://'], ['etcd:'], ['etcds://'], ['redis:///ß∞'],
                ['redis://', 'redis://']
            ].forEach(function (urls) {

                it(urls, function () {
                    var u = urls;
                    if (urls instanceof Array) {
                        u = urls[0];
                    }
                    var t = u.match(/^([a-z]+)/).pop();
                    if (t !== 'redis') {
                        t = t.replace(/s$/, '');
                    }
                    var driverClass = require('../../lib/drivers/' + t);

                    var driverInstance = factory.getDriver(urls);
                    // Don't leak the drivers - so, destroy whenever they reach error or ready
                    driverInstance.once('error', function() {
                        driverInstance.destructor();
                    });
                    driverInstance.once('ready', driverInstance.destructor);
                    // Ignore any possible subsequent error - fix #198
                    // as redis emits two errors if an explicit db is provided
                    driverInstance.on('error', function() {});

                    expect(driverInstance).to.be.an.instanceof(driverClass);
                    expect(driverInstance).to.be.an.instanceof(idriver);
                });
            });
        });

        describe('#erroring-on-bogus-urls', function () {
            it('"nopassaran://" (unregistered) should emit error', function (done) {
                factory.once('error', function (e) {
                    expect(e).to.be.instanceof(DriverError);
                    expect(e.category).to.eql(DriverError.MISSING_DRIVER);
                    done();
                });
                factory.getDriver(['nopassaran://']);
            });

            it('"bogus" (no scheme) should emit error', function (done) {
                factory.once('error', function (e) {
                    expect(e).to.be.instanceof(DriverError);
                    expect(e.category).to.eql(DriverError.BOGUS_URL);
                    done();
                });
                factory.getDriver(['bogus']);
            });

            it('drivertpl:// (which is broken) should emit error', function (done) {
                factory.once('error', function (e) {
                    expect(e).to.be.instanceof(DriverError);
                    expect(e.category).to.eql(DriverError.BROKEN_DRIVER);
                    done();
                });
                factory.getDriver(['drivertpl://']);
            });
        });

    });
})();
