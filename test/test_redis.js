(function () {
    /*globals describe:false, it:false, before:false, after:false, afterEach:false*/
    'use strict';
    // Useful if you want to see redis servers talk to you
    // require('npmlog').level = 'silly';

    var expect = require('chai').expect;

    var RedisServer = require('./fixtures/redis-server');
    var HipRedis = require('../lib/redis.js');

    var rs1 = new RedisServer();
    var rs2 = new RedisServer();
    var rs3 = new RedisServer();

    // Start redis servers beforehand
    before(function () {
        rs1.start(['port 7777']);
        rs2.start(['port 8888', 'requirepass superpassword']);
    });

    // Shutdown pips!
    after(function () {
        rs1.stop();
        rs2.stop();
        rs3.stop();
    });

    describe('Redis', function () {
        var red;
        afterEach(function () {
            // Ensure STOPPED client in any case
            red.stop();
        });

        describe('#simple-redis, no authentication', function () {
            it('Bogus host fail', function (done) {
                red = new HipRedis('wontresolve', 7777);
                // Expect to reenter on error, not connected
                var handler = function (e) {
                    expect(red.connected).to.eql(false);
                    expect(e).to.eql(new Error());
                    // Force stop NOW
                    red.stop();
                    done();
                };
                red.on('error', handler);
                red.on('ready', handler);
            });
            it('Bogus port fail', function (done) {
                red = new HipRedis(null, 123456);
                // Expect to reenter on error, not connected
                var handler = function (e) {
                    expect(red.connected).to.eql(false);
                    expect(e).to.eql(new Error());
                    // Force stop NOW
                    red.stop();
                    done();
                };
                red.on('error', handler);
                red.on('ready', handler);
            });
            it('Successful connection', function (done) {
                red = new HipRedis(null, 7777);
                // Expect to reenter on ready, connected
                var handler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e).to.eql(undefined);
                    // Force stop NOW
                    red.stop();
                    done();
                };
                red.on('error', handler);
                red.on('ready', handler);
            });

        });

        describe('#authenticated-redis', function () {
            it('Wrong password', function (done) {
                red = new HipRedis(null, 8888);
                // Expect to reenter on error, connected
                var handler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e).to.eql(new Error());
                    // Force stop NOW
                    red.stop();
                    done();
                };
                red.on('error', handler);
                red.on('ready', handler);
            });

            it('Ok password', function (done) {
                red = new HipRedis(null, 8888, null, 'superpassword');
                // Expect to reenter on ready, connected
                var handler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e).to.eql(undefined);
                    // Force stop NOW
                    red.stop();
                    done();
                };
                red.on('error', handler);
                red.on('ready', handler);
            });
        });

        describe('#wacky-redis', function () {
            it('loosing connection', function (done) {
                rs3.start(['port 9999']);
                red = new HipRedis(null, 9999);
                var readyHandler = function (e) {
                    expect(red.connected).to.eql(true);
                    expect(e).to.eql(undefined);
                    // Kill the redis
                    rs3.stop();
                };
                var errorHandler = function (e) {
                    // We are down
                    expect(e).to.eql(new Error());
                    red.stop();
                    done();
                };
                red.on('error', errorHandler);
                red.on('ready', readyHandler);
            });
        });

    });
})();
