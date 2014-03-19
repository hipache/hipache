(function () {
    /*globals describe:false, it:false, before:false, after:false, afterEach:false*/
    'use strict';

    // Useful if you want to see servers talk to you
    // require('npmlog').level = 'silly';

    var expect = require('chai').expect;

    var Driver = require('../../lib/drivers/etcd');
    var Server = require('../fixtures/servers/etcd');

    var s1 = new Server();
    var s2 = new Server();
    var s3 = new Server();

    // Start all servers beforehand
    before(function () {
        // Simple server
        s1.start(['-bind-addr=127.0.0.1:8001', '-addr=127.0.0.1:8001', '-peer-bind-addr=127.0.0.1:8011', '-peer-addr=127.0.0.1:8011']);
        // With authentication
        // s2.start(['-bind-addr=127.0.0.1:7002', '-addr=127.0.0.1:8002', '-peer-bind-addr=127.0.0.1:8012', '-peer-addr=127.0.0.1:8012']);
        // Wacky server
        // s3.start(['-bind-addr=127.0.0.1:8003', '-addr=127.0.0.1:8003', '-peer-bind-addr=127.0.0.1:8013', '-peer-addr=127.0.0.1:8013']);
    });

    // Shutdown pips!
    after(function () {
        s1.stop();
        // s2.stop();
        // s3.stop();
    });

    describe('Etcd', function () {
        var red;

        afterEach(function () {
            // Ensure STOPPED client in any case
            red.destructor();
        });

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

        describe('#reading', function () {
            it('Domain with no match, no fallback', function (done) {
                red = new Driver('etcd://:8001');

                red.read(['unmatched.com', '*'], function (err, data) {
                    console.warn('----', err, data);
                    expect(data).to.eql([
                        [],
                        [],
                        []
                    ]);
                    red.destructor();
                    done();
                });
            });

            // it('Single domain with a backend', function (done) {
            //     red = new Driver('etcd://:7001');
            //     red.create('domain.com', 'myvhost', function () {
            //         red.add('domain.com', 'backend:1234', function () {
            //             red.read(['domain.com', '*'], function (err, data) {
            //                 expect(data).to.eql([
            //                     ['myvhost', 'backend:1234'],
            //                     [],
            //                     []
            //                 ]);
            //                 red.destructor();
            //                 done();
            //             });
            //         });
            //     });
            // });

            // it('Single domain with multiple backends', function (done) {
            //     red = new Driver('etcd://:7001');
            //     red.add('domain.com', 'backend:4567', function () {
            //         red.read(['domain.com', '*'], function (err, data) {
            //             expect(data).to.eql([
            //                 ['myvhost', 'backend:1234', 'backend:4567'],
            //                 [],
            //                 []
            //             ]);
            //             red.destructor();
            //             done();
            //         });
            //     });
            // });

            // it('Single domain with multiple backends and fallback', function (done) {
            //     red = new Driver('etcd://:7001');
            //     red.add('*', 'backend:910', function () {
            //         red.read(['domain.com', '*'], function (err, data) {
            //             expect(data).to.eql([
            //                 ['myvhost', 'backend:1234', 'backend:4567'],
            //                 ['backend:910'],
            //                 []
            //             ]);
            //             red.destructor();
            //             done();
            //         });
            //     });
            // });

            // it('Single domain with multiple backends and fallback plus dead', function (done) {
            //     red = new Driver('etcd://:7001');
            //     red.mark('domain.com', 1, 'backend:4567', 2, 1, function (e, d) {
            //         red.read(['domain.com', '*'], function (err, data) {
            //             expect(data).to.eql([
            //                 ['myvhost', 'backend:1234', 'backend:4567'],
            //                 ['backend:910'],
            //                 ['1']
            //             ]);

            //             // Now, let it expire
            //             setTimeout(function () {
            //                 red.read(['domain.com', '*'], function (err, data) {
            //                     expect(data).to.eql([
            //                         ['myvhost', 'backend:1234', 'backend:4567'],
            //                         ['backend:910'],
            //                         []
            //                     ]);
            //                     red.destructor();
            //                     done();
            //                 });
            //             }, 1000);
            //         });
            //     });
            // });
        });

    });


})();
