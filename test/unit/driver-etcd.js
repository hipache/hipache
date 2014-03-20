(function () {
    /*globals describe:false, before:false, after:false*/
    'use strict';

    var npmlog = require('npmlog');

    if (process.env.NO_ETCD) {
        npmlog.error('Test', 'No etcd server on this machine! No tests, then.');
        return;
    }

    // Useful if you want to see servers talk to you
    // require('npmlog').level = 'silly';

    // var expect = require('chai').expect;

    var Driver = require('../../lib/drivers/etcd');
    var Server = require('../fixtures/servers/etcd');

    var s1 = new Server();
    // var s2 = new Server();
    // var s3 = new Server();

    // Start all servers beforehand
    before(function (done) {
        s1.start(['-bind-addr=127.0.0.1:8001', '-addr=127.0.0.1:8001', '-peer-bind-addr=127.0.0.1:8011',
            '-peer-addr=127.0.0.1:8011']);

        // For some reason, etcd needs time to take-off the ground :(
        s1.once('started', function () {
            setTimeout(function () {
                done();
            }, 1500);
        });

        // Simple server
        // With authentication
        // s2.start(['-bind-addr=127.0.0.1:7002', '-addr=127.0.0.1:8002', '-peer-bind-addr=127.0.0.1:8012',
        // '-peer-addr=127.0.0.1:8012']);
        // Wacky server
        // s3.start(['-bind-addr=127.0.0.1:8003', '-addr=127.0.0.1:8003', '-peer-bind-addr=127.0.0.1:8013',
        // '-peer-addr=127.0.0.1:8013']);
    });

    // Shutdown pips!
    after(function () {
        s1.stop();
        // s2.stop();
        // s3.stop();
    });

    var testReading = require('./driver-test-reading');

    describe('Etcd', function () {
        describe('#operating', function () {
            testReading(Driver, ['etcd://:8001']);
        });

        describe('#operating-use-prefix', function () {
            testReading(Driver, ['etcd://:8001/#someprefix']);
        });
    });


        // var red;

        // afterEach(function () {
        //     // Ensure STOPPED client in any case
        //     red.destructor();
        // });

        // describe('#simple, no authentication', function () {
        //     // it('Bogus host fail', function (done) {
        //     //     red = new Driver('etcd://wontresolve:8001');
        //     //     // Expect to reenter on error, not connected
        //     //     var handler = function (e) {
        //     //         expect(red.connected).to.eql(false);
        //     //         expect(e).to.eql(new Error());
        //     //         // Force stop NOW
        //     //         red.destructor();
        //     //         done();
        //     //     };
        //     //     red.on('error', handler);
        //     //     red.on('ready', handler);
        //     // });
        //     it('Bogus port fail', function (done) {
        //         red = new Driver('etcd://:123456');
        //         // Expect to reenter on error, not connected
        //         var handler = function (e) {
        //             expect(red.connected).to.eql(false);
        //             expect(e).to.eql(new Error());
        //             // Force stop NOW
        //             red.destructor();
        //             done();
        //         };
        //         red.on('error', handler);
        //         red.on('ready', handler);
        //     });
        //     it('Successful connection', function (done) {
        //         red = new Driver('etcd://:8001');
        //         // Expect to reenter on ready, connected
        //         var handler = function (e) {
        //             expect(red.connected).to.eql(true);
        //             expect(e).to.eql(undefined);
        //             // Force stop NOW
        //             red.destructor();
        //             done();
        //         };
        //         red.on('error', handler);
        //         red.on('ready', handler);
        //     });

        // });

        // XXX authentication is not supported by this driver
        // describe('#authenticated', function () {
        //     it('No password', function (done) {
        //         red = new Driver('etcd://:7002');
        //         // Expect to reenter on error, connected
        //         var handler = function (e) {
        //             expect(red.connected).to.eql(true);
        //             expect(e).to.eql(new Error());
        //             // Force stop NOW
        //             red.destructor();
        //             done();
        //         };
        //         red.on('error', handler);
        //         red.on('ready', handler);
        //     });

        //     it('Wrong password', function (done) {
        //         red = new Driver('etcd://:bogusshit@:7002');
        //         // Expect to reenter on error, connected
        //         var handler = function (e) {
        //             expect(red.connected).to.eql(true);
        //             expect(e).to.eql(new Error());
        //             // Force stop NOW
        //             red.destructor();
        //             done();
        //         };
        //         red.on('error', handler);
        //         red.on('ready', handler);
        //     });

        //     it('Ok password', function (done) {
        //         red = new Driver('etcd://:superpassword@:7002');
        //         // Expect to reenter on ready, connected
        //         var handler = function (e) {
        //             expect(red.connected).to.eql(true);
        //             expect(e).to.eql(undefined);
        //             // Force stop NOW
        //             red.destructor();
        //             done();
        //         };
        //         red.on('error', handler);
        //         red.on('ready', handler);
        //     });
        // });

        // describe('#wacky', function () {
        //     it('loosing connection', function (done) {
        //         red = new Driver('etcd://:7003');
        //         var readyHandler = function (e) {
        //             expect(red.connected).to.eql(true);
        //             expect(e).to.eql(undefined);
        //             // Kill the redis
        //             rs3.stop();
        //         };
        //         var errorHandler = function (e) {
        //             // We are down
        //             expect(e).to.eql(new Error());
        //             red.destructor();
        //             done();
        //         };
        //         red.on('error', errorHandler);
        //         red.on('ready', readyHandler);
        //     });
        // });



})();
