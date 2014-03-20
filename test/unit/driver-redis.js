(function () {
    /*globals describe:false, it:false, before:false, after:false, afterEach:false*/
    'use strict';

    // Useful if you want to see servers talk to you
    // require('npmlog').level = 'silly';

    var expect = require('chai').expect;

    var Driver = require('../../lib/drivers/redis');
    var Server = require('../fixtures/servers/redis');

    var s1 = new Server();
    var s2 = new Server();
    var s3 = new Server();

    // Start all servers beforehand
    before(function () {
        s1.start(['port 7001']);
        s2.start(['port 7002', 'requirepass superpassword']);
        s3.start(['port 7003']);
    });

    // Shutdown pips!
    after(function () {
        s1.stop();
        s2.stop();
        s3.stop();
    });

    var testReading = require('./driver-test-reading');

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
                    expect(e).to.eql(new Error());
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
                    expect(e).to.eql(new Error());
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
                    expect(e).to.eql(new Error());
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
                    expect(e).to.eql(new Error());
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
            it('loosing connection', function (done) {
                red = new Driver(['redis://:7003']);
                var readyHandler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e).to.eql(undefined);
                    // Kill the redis
                    s3.stop();
                };
                var errorHandler = function (e) {
                    // We are down
                    expect(e).to.eql(new Error());
                    red.destructor();
                    done();
                };
                red.once('error', errorHandler);
                red.once('ready', readyHandler);
            });
        });

        describe('#operating', function () {
            testReading(Driver, ['redis://:7001']);
        });

        describe('#operating-use-prefix', function () {
            testReading(Driver, ['redis://:7001/#someprefix']);
        });

        describe('#operating-use-database', function () {
            testReading(Driver, ['redis://:7001/1#someprefix']);
        });

        describe('#operating-use-database-and-prefix', function () {
            testReading(Driver, ['redis://:7001/2#someprefix']);
        });

        describe('#operating-use-wholeshit', function () {
            testReading(Driver, ['redis://:superpassword@:7002/1#someprefix']);
        });

    });
})();
