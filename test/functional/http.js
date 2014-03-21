(function () {
    /*globals describe:false, it:false, before:false, after:false*/
    'use strict';

    var expect = require('chai').expect;
    var commander = require('../fixtures/commander');
    var redis = require('redis');
    var http = require('http');
    // var npmlog = require('npmlog');
    // npmlog.level = 'silly';


    var driver;

    // Start redis
    before(function (done) {
        commander.startRedis(null, done);
    });

    // Start client
    before(function () {
        driver = redis.createClient(7777, '127.0.0.1');
    });

    // Start hipache
    before(function (done) {
        this.timeout(5000);
        // Hipache needs quite some time to get of the ground, and we lack a signal...
        commander.startHipache(null, function () {
            setTimeout(done, 2000);
        });
    });

    // Start 10 httpd, starting with port 2080 and answer code 201
    var httpdcount = 10;
    var httpdcountok = 7;
    var port = 2080;
    var code = 201;
    var httpd = [];
    for (var x = 0; x < httpdcount; x++) {
        httpd.push('');
    }

    // Startd httpd daemon pool with ok middleware
    var okMiddleWare = function (code, req, res) {
        res.statusCode = code;
        res.setHeader('X-Requested', req.headers.host);
        res.end('Shoobidouwa\n');
        req.connection.destroy();
    };

    httpd.forEach(function (v, k) {
        before(function (done) {
            // Have failing backends after
            httpd.shift();
            var k2 = k;
            if (k >= httpdcountok) {
                k2 += 300;
            }
            httpd.push(commander.startHttp(port + k, okMiddleWare.bind({}, code + k2)));
            done();
        });
    }, this);


    // Helpers methods
    var getter = function (hostname, callback) {
        var options = {
            hostname: '127.0.0.1',
            headers: {Host: hostname},
            port: 1080,
            path: '',
            method: 'GET'/*,
            callback: callback*/
        };

        var req = http.request(options, callback);
        // req.on('error', function () {
        //     console.warn('aaaa', arguments);
        // });
        req.end();
    };

    var bulkTest = function (tests) {
        Object.keys(tests).forEach(function (host) {
            it(host, function (done) {
                getter(host, function (res) {
                    // console.warn(res.headers, res.statusCode);
                    expect(res.statusCode).to.eql(tests[host]);
                    // So, unless the connection is destroy, we are obviously flooding
                    // the server...
                    res.connection.destroy();
                    done();
                });
            });
        });
    };

    describe('Domain matching, single backends', function () {

        describe('#alone-simple-domain', function () {
            before(function (done) {
                driver.rpush(['frontend:simple', 'simple', 'http://localhost:' + port], done);
            });

            bulkTest({
                'simple': code
            });

            after(function (done) {
                driver.flushdb(done);
            });
        });

        describe('#multiple-simple-domains', function () {
            before(function (done) {
                driver.rpush(['frontend:simple', 'simple', 'http://localhost:' + port], done);
            });

            before(function (done) {
                driver.rpush(['frontend:foo.bar', 'foo.bar', 'http://localhost:' + (port + 1)], done);
            });

            before(function (done) {
                driver.rpush(['frontend:a.b.c.d.e.f.g.h.i.j.k.l.m', 'a.b.c.d.e.f.g.h.i.j.k.l.m',
                    'http://localhost:' + (port + 2)], done);
            });

            bulkTest({
                'simple': code,
                'foo.bar': code + 1,
                'a.b.c.d.e.f.g.h.i.j.k.l.m': code + 2
            });

            after(function (done) {
                driver.flushdb(done);
            });
        });

        describe('#single-wildcard', function () {
            before(function (done) {
                driver.rpush(['frontend:*.foo.bar', '*.foo.bar', 'http://localhost:' + port], done);
            });

            bulkTest({
                'test.foo.bar': code,
                'pipo.foo.bar': code,
                'foo.bar': 400
            });

            after(function (done) {
                driver.flushdb(done);
            });
        });

        describe('#single-wildcard-short-domain', function () {
            before(function (done) {
                driver.rpush(['frontend:*.foo', '*.foo', 'http://localhost:' + port], done);
            });

            bulkTest({
                'bar.foo': code,
                'foo.bar': 400,
                'foo': 400
            });

            after(function (done) {
                driver.flushdb(done);
            });
        });

        describe('#wildcard-priority', function () {
            before(function (done) {
                driver.rpush(['frontend:*.foo.bar', '*.foo.bar', 'http://localhost:' + port], done);
            });

            before(function (done) {
                driver.rpush(['frontend:foo.bar', 'foo.bar', 'http://localhost:' + (port + 1)], done);
            });

            before(function (done) {
                driver.rpush(['frontend:pipo.foo.bar', 'pipo.foo.bar', 'http://localhost:' + (port + 2)], done);
            });

            before(function (done) {
                driver.rpush(['frontend:*.baz.foo.bar', '*.baz.foo.bar', 'http://localhost:' + (port + 3)], done);
            });

            bulkTest({
                'test.foo.bar': code,
                'foo.bar': code + 1,
                'pipo.foo.bar': code + 2,
                'qux.baz.foo.bar': code + 3,
                'qux.bix.foo.bar': code,
                'qux.bix.bar.foo': 400
            });

            after(function (done) {
                driver.flushdb(done);
            });
        });

        describe('#wildcard-depth', function () {
            before(function (done) {
                driver.rpush(['frontend:*.quux', '*.quux', 'http://localhost:' + port], done);
            });

            before(function (done) {
                driver.rpush(['frontend:*.qux.quux', '*.qux.quux', 'http://localhost:' + (port + 1)], done);
            });

            before(function (done) {
                driver.rpush(['frontend:*.baz.qux.quux', '*.baz.qux.quux', 'http://localhost:' + (port + 2)], done);
            });

            before(function (done) {
                driver.rpush(['frontend:*.bar.baz.qux.quux', '*.bar.baz.qux.quux',
                    'http://localhost:' + (port + 3)], done);
            });

            before(function (done) {
                driver.rpush(['frontend:foo.bar.baz.qux.quux', 'foo.bar.baz.qux.quux',
                    'http://localhost:' + (port + 4)], done);
            });

            before(function (done) {
                driver.rpush(['frontend:*.foo.bar.baz.qux.quux', '*.foo.bar.baz.qux.quux',
                    'http://localhost:' + (port + 5)], done);
            });

            before(function (done) {
                driver.rpush(['frontend:*.quuux.foo.bar.baz.qux.quux', '*.quuux.foo.bar.baz.qux.quux',
                    'http://localhost:' + (port + 6)], done);
            });


            bulkTest({
                'too.deep.quuux.foo.bar.baz.qux.quux': code + 5,
                'too.deep.foo.bar.baz.qux.quux': code + 5,
                'foo.bar.baz.qux.quux': code + 4,
                'bar.bar.baz.qux.quux': code + 3,
                'foo.baz.qux.quux': code + 2,
                'foo.qux.quux': code + 1,
                'foo.quux': code
            });

            after(function (done) {
                driver.flushdb(done);
            });
        });

    });

    describe('Multi backends', function () {
        describe('#alone-simple-domain', function () {
            before(function (done) {
                driver.rpush(['frontend:foobar', 'foobar',
                    'http://localhost:' + port,
                    'http://localhost:' + (port + 1),
                    'http://localhost:' + (port + 2)
                ], done);
            });

            for (var x = 0; x < 20; x++) {
                /*jshint loopfunc: true */
                it('foobar' + x, function (done) {
                    getter('foobar', function (res) {
                        expect(res.statusCode).to.be.above(code - 1);
                        expect(res.statusCode).to.be.below(code + 3);
                        res.connection.destroy();
                        done();
                    });
                });
            }

            after(function (done) {
                driver.flushdb(done);
            });
        });

        describe('#absent-simple-domain', function () {
            bulkTest({
                'simple': 400
            });
        });

        describe('#one-of-the-backends-is-down', function () {
            before(function (done) {
                driver.rpush(['frontend:simple', 'simple', 'http://localhost:' + port, 'http://localhost:15000'], done);
            });

            // Let's try to beat the odds...
            var madeFail;
            for (var x = 0; x < 20; x++) {
                /*jshint loopfunc: true */
                it('try hitting the unbound backend' + x, function (done) {
                    getter('simple', function (res) {
                        // If we haven't hit the failing backend yet, and we have a failing code
                        // then mark as failed
                        if (!madeFail && (res.statusCode === 502)) {
                            madeFail = true;
                        } else {
                            // Otherwise, by all means we should get a 200
                            expect(res.statusCode).to.eql(code);
                        }
                        res.connection.destroy();
                        done();
                    });
                });
            }

            it('did hit the unbound backend', function () {
                expect(madeFail).to.eql(true);
            });

            after(function (done) {
                driver.flushdb(done);
            });
        });


        describe('#one-of-the-backends-is-failing', function () {
            before(function (done) {
                driver.rpush(['frontend:simple', 'simple', 'http://localhost:' + port,
                    'http://localhost:' + (port + httpdcountok)], done);
            });

            // Let's try to beat the odds...
            var madeFail;
            for (var x = 0; x < 20; x++) {
                /*jshint loopfunc: true */
                it('try hitting the failing backend' + x, function (done) {
                    getter('simple', function (res) {
                        // If we haven't hit the failing backend yet, and we have a failing code
                        // then mark as failed
                        if (!madeFail && (res.statusCode === code + 300 + httpdcountok)) {
                            madeFail = true;
                        } else {
                            // Otherwise, by all means we should get a 200
                            expect(res.statusCode).to.eql(code);
                        }
                        res.connection.destroy();
                        done();
                    });
                });
            }

            it('did hit the failing backend', function () {
                expect(madeFail).to.eql(true);
            });

            after(function (done) {
                driver.flushdb(done);
            });
        });
    });

    // Stop httpd daemon pool
    httpd.forEach(function () {
        after(function (done) {
            httpd.shift().close(done);
        });
    });

    // Stop redis driver, redis server and hipache
    after(function (done) {
        driver.end();
        commander.stopAll(done);
    });


})();
