(function () {
    /*globals describe:false, it:false, before:false, after:false, afterEach:false*/
    'use strict';

    // Useful if you want to see servers talk to you
    // require('npmlog').level = 'silly';

    var expect = require('chai').expect;

    var Driver = require('../../lib/drivers/memcached');
    var Server = require('../fixtures/servers/memcached');

    var s1 = new Server();
    var s2 = new Server();
    var s3 = new Server();

    // Start all servers beforehand
    before(function () {
        s1.start(['9001']);
        s2.start(['9002']);
        s3.start(['9003']);
    });

    // Shutdown pips!
    after(function () {
        s1.stop();
        s2.stop();
        s3.stop();
    });


    describe('Memcached', function () {
    //     var red;

    //     afterEach(function () {
    //         // Ensure STOPPED client in any case
    //         red.destructor();
    //     });

    //     describe('#simple-redis, no authentication', function () {
    //         it('Bogus host fail', function (done) {
    //             red = new Driver('redis://wontresolve:7001');
    //             // Expect to reenter on error, not connected
    //             var handler = function (e) {
    //                 expect(red.connected).to.eql(false);
    //                 expect(e).to.eql(new Error());
    //                 // Force stop NOW
    //                 red.destructor();
    //                 done();
    //             };
    //             red.on('error', handler);
    //             red.on('ready', handler);
    //         });
    //         it('Bogus port fail', function (done) {
    //             red = new Driver('redis://:123456');
    //             // Expect to reenter on error, not connected
    //             var handler = function (e) {
    //                 expect(red.connected).to.eql(false);
    //                 expect(e).to.eql(new Error());
    //                 // Force stop NOW
    //                 red.destructor();
    //                 done();
    //             };
    //             red.on('error', handler);
    //             red.on('ready', handler);
    //         });
    //         it('Successful connection', function (done) {
    //             red = new Driver('redis://:7001');
    //             // Expect to reenter on ready, connected
    //             var handler = function (e) {
    //                 expect(red.connected).to.eql(true);
    //                 expect(e).to.eql(undefined);
    //                 // Force stop NOW
    //                 red.destructor();
    //                 done();
    //             };
    //             red.on('error', handler);
    //             red.on('ready', handler);
    //         });

    //     });

    //     describe('#authenticated-redis', function () {
    //         it('No password', function (done) {
    //             red = new Driver('redis://:7002');
    //             // Expect to reenter on error, connected
    //             var handler = function (e) {
    //                 expect(red.connected).to.eql(true);
    //                 expect(e).to.eql(new Error());
    //                 // Force stop NOW
    //                 red.destructor();
    //                 done();
    //             };
    //             red.on('error', handler);
    //             red.on('ready', handler);
    //         });

    //         it('Wrong password', function (done) {
    //             red = new Driver('redis://:bogusshit@:7002');
    //             // Expect to reenter on error, connected
    //             var handler = function (e) {
    //                 expect(red.connected).to.eql(true);
    //                 expect(e).to.eql(new Error());
    //                 // Force stop NOW
    //                 red.destructor();
    //                 done();
    //             };
    //             red.on('error', handler);
    //             red.on('ready', handler);
    //         });

    //         it('Ok password', function (done) {
    //             red = new Driver('redis://:superpassword@:7002');
    //             // Expect to reenter on ready, connected
    //             var handler = function (e) {
    //                 expect(red.connected).to.eql(true);
    //                 expect(e).to.eql(undefined);
    //                 // Force stop NOW
    //                 red.destructor();
    //                 done();
    //             };
    //             red.on('error', handler);
    //             red.on('ready', handler);
    //         });
    //     });

    //     describe('#wacky-redis', function () {
    //         it('loosing connection', function (done) {
    //             red = new Driver('redis://:7003');
    //             var readyHandler = function (e) {
    //                 expect(red.connected).to.eql(true);
    //                 expect(e).to.eql(undefined);
    //                 // Kill the redis
    //                 rs3.stop();
    //             };
    //             var errorHandler = function (e) {
    //                 // We are down
    //                 expect(e).to.eql(new Error());
    //                 red.destructor();
    //                 done();
    //             };
    //             red.on('error', errorHandler);
    //             red.on('ready', readyHandler);
    //         });
    //     });
    });

})();
