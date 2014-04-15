(function () {
    /*globals describe:false, it:false, before:false, after:false, afterEach:false*/
    'use strict';

    var npmlog = require('npmlog');
    var DriverError = require('../../lib/utils/drivererror');

    if (process.env.NO_REDIS) {
        npmlog.error('Test', 'No redis server on this machine! No tests, then.');
        return;
    }

    // Useful if you want to see servers talk to you
    // require('npmlog').level = 'silly';

    var expect = require('chai').expect;

    var Driver = require('../../lib/drivers/redis');
    var Server = require('../fixtures/servers/redis');
    var testReading = require('./driver-test-reading');

    var s1 = new Server();
    var s2 = new Server();
    var s3 = new Server();

    // Start all needed servers
    before(function (done) {
        s1.start('port 7001').once('started', function () {
            s2.start(['port 7002', 'requirepass superpassword']).once('started', function () {
                s3.start(['port 7003', 'slaveof 127.0.0.1 7001']).once('started', done);
            });
        });
    });

    // Shutdown
    after(function (done) {
        s1.stop().once('stopped', function () {
            s2.stop().once('stopped', function () {
                s3.stop().once('stopped', done);
            });
        });
    });

    describe('Redis', function () {
        var red;

        afterEach(function () {
            // Ensure STOPPED client in any case
            red.destructor();
        });

        describe('#connecting-no-authent', function () {
            it('Bogus host fail', function (done) {
                red = new Driver(['redis://wontresolve:7001']);
                // Expect to reenter on error, not connected
                var handler = function (e) {
                    expect(red.connected).to.eql(false);
                    expect(e.name).to.eql('DriverError');
                    expect(e.category).to.eql(DriverError.UNSPECIFIED);
                    // Force stop NOW
                    red.destructor();
                    done();
                };
                red.once('error', handler);
                red.once('ready', handler);
            });
            it('Bogus port fail', function (done) {
                red = new Driver(['redis://:123456']);
                // Expect to reenter on error, not connected
                var handler = function (e) {
                    expect(red.connected).to.eql(false);
                    expect(e.name).to.eql('DriverError');
                    expect(e.category).to.eql(DriverError.UNSPECIFIED);
                    // Force stop NOW
                    red.destructor();
                    done();
                };
                red.once('error', handler);
                red.once('ready', handler);
            });
            // Does redis really return an error in that case?
            // it('Bogus database fail', function (done) {
            //     red = new Driver(['redis://:7001/whateverthefuck']);
            //     // Expect to reenter on error, not connected
            //     var handler = function (e) {
            //         console.warn('************', e);
            //         // expect(red.connected).to.eql(true);
            //         // expect(e).to.eql(new Error());
            //         // Force stop NOW
            //         red.destructor();
            //         done();
            //     };
            //     red.on('error', handler);
            //     red.on('ready', handler);
            // });
            it('Successful connection', function (done) {
                red = new Driver(['redis://:7001']);
                // Expect to reenter on ready, connected
                var handler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e).to.eql(undefined);
                    // Force stop NOW
                    red.destructor();
                    done();
                };
                red.once('error', handler);
                red.once('ready', handler);
            });

        });

        describe('#connecting-authentication', function () {
            it('No password', function (done) {
                red = new Driver(['redis://:7002']);
                // Expect to reenter on error, connected
                var handler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e.name).to.eql('DriverError');
                    expect(e.category).to.eql(DriverError.UNSPECIFIED);
                    // Force stop NOW
                    red.destructor();
                    done();
                };
                red.once('error', handler);
                red.once('ready', handler);
            });

            it('Wrong password', function (done) {
                red = new Driver(['redis://:bogusshit@:7002']);
                // Expect to reenter on error, connected
                var handler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e.name).to.eql('DriverError');
                    expect(e.category).to.eql(DriverError.UNSPECIFIED);
                    // Force stop NOW
                    red.destructor();
                    done();
                };
                red.once('error', handler);
                red.once('ready', handler);
            });

            it('Ok password', function (done) {
                red = new Driver(['redis://:superpassword@:7002']);
                // Expect to reenter on ready, connected
                var handler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e).to.eql(undefined);
                    // Force stop NOW
                    red.destructor();
                    done();
                };
                red.once('error', handler);
                red.once('ready', handler);
            });
        });

        describe('#wacky', function () {
            var s = new Server();
            before(function (done) {
                s.start('port 7004').once('started', done);
            });

            it('loosing connection', function (done) {
                red = new Driver(['redis://:7004']);
                var readyHandler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e).to.eql(undefined);
                    // Kill the redis
                    s.stop();
                };
                var errorHandler = function (e) {
                    // We are down
                    expect(e.name).to.eql('DriverError');
                    expect(e.category).to.eql(DriverError.UNSPECIFIED);
                    red.destructor();
                    done();
                };
                red.once('error', errorHandler);
                red.once('ready', readyHandler);
            });

        // Writing on a slave
            // ['redis://:7003/4']

        });

        [
        // Simple
            ['redis://:7001'],
        // Use prefixes
            ['redis://:7001/#someprefix'],
        // Use databases
            ['redis://:7001/1'],
        // Use database and prefix
            ['redis://:7001/2#someprefix'],
        // Use authentication, database and prefix
            ['redis://:superpassword@:7002/1#someprefix']
        // XXX Use master / slave. Too hard to predict replication timings
            // ['redis://:7003/3', 'redis://:7001/3']
        ].forEach(function (setup) {
            describe(setup, function () {
                testReading(Driver, setup);
            });
        });

    });
})();
