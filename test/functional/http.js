(function () {
    /*globals describe:false, it:false, before:false, after:false*/
    'use strict';

    var expect = require('chai').expect;
    var commander = require('../fixtures/commander');
    var http = require('http');
    var Readable = require('stream').Readable;
    var fs = require('fs');
    var npmlog = require('npmlog');

    // Useful if you want to see servers talk to you
    // npmlog.level = 'silly';

    if (process.env.NO_REDIS) {
        npmlog.error('Test', 'No redis server on this machine! No tests, then.');
        return;
    }



    // Kinky helper to be used by tests
    var host = function (name) {
        return new (function () {
            this.connects = function (backends) {
                before(function (done) {
                    commander.redis.declare(name, backends, done);
                });
                return this;
            };

            this.queries = function (method, stream, statusCode) {
                var testName = 'Hostname ' + name;
                if (!(statusCode instanceof Function)) {
                    testName += ' should answer: ' + statusCode;
                }
                it(testName, function (done) {
                    var opts = {
                        hostname: hipacheHost,
                        headers: {Host: name},
                        port: hipachePort,
                        path: '',
                        method: method || 'GET'
                    };

                    if (stream && (stream instanceof Readable)) {
                        opts.headers['Transfer-encoding'] = 'chunked';
                    }

                    var req = http.request(opts, function (res) {
                        // Unless the connection is destroyed we are flooding the server...
                        res.connection.destroy();

                        if (!(statusCode instanceof Function)) {
                            statusCode = statusCode.toString().split('-');
                            var up = parseInt(statusCode.pop(), 10);
                            expect(res.statusCode).to.be.below(up + 1);
                            expect(res.statusCode).to.be.above(parseInt(statusCode.pop() || up, 10) - 1);
                        } else {
                            statusCode(res.statusCode);
                        }
                        done();
                    });

                    if (stream) {
                        if (stream instanceof Readable) {
                            stream.pipe(req);
                            return;
                        } else {
                            req.write(JSON.stringify(stream));
                        }
                    }

                    req.end();

                });
                return this;
            };

            // Consider these as generally without body
            this.gets = this.queries.bind(this, 'GET', null);
            this.heads = this.queries.bind(this, 'HEAD', null);
            this.options = this.queries.bind(this, 'OPTIONS', null);
            this.traces = this.queries.bind(this, 'TRACE', null);
            this.deletes = this.queries.bind(this, 'DELETE', null);
            this.posts = this.queries.bind(this, 'POST');
            this.puts = this.queries.bind(this, 'PUT');

        })();
    };

    host.flush = function () {
        after(function (done) {
            commander.redis.flush(done);
        });
    };


    // A simple final middleware that returns given code
    var okMiddleWare = function (code, req, res) {
        // var bodyString = '';
        req.on('data', function(chunk) {
            chunk.toString();
        });

        req.on('end', function() {
            res.statusCode = code;
            res.end('Shoobidouwa\n');
            req.connection.destroy();
            // console.warn('Got body', bodyString);
        });
    };




    // Start redis
    before(function (done) {
        commander.redis.start(null, done);
    });

    // Start hipache
    before(function (done) {
        commander.hipache.start(null, done);
    });

    // Where to connect...
    var hipachePort = 1080;
    var hipacheHost = '127.0.0.1';

    // A stack of httpd
    before(function () {
        commander.startHttp({port: 8201, middleware: okMiddleWare.bind({}, 201)});
        commander.startHttp({port: 8202, middleware: okMiddleWare.bind({}, 202)});
        commander.startHttp({port: 8203, middleware: okMiddleWare.bind({}, 203)});
        commander.startHttp({port: 8204, middleware: okMiddleWare.bind({}, 204)});
        commander.startHttp({port: 8205, middleware: okMiddleWare.bind({}, 205)});
        commander.startHttp({port: 8206, middleware: okMiddleWare.bind({}, 206)});
        commander.startHttp({port: 8207, middleware: okMiddleWare.bind({}, 207)});

        commander.startHttp({port: 8501, middleware: okMiddleWare.bind({}, 501)});
        commander.startHttp({port: 8502, middleware: okMiddleWare.bind({}, 502)});
        commander.startHttp({port: 8503, middleware: okMiddleWare.bind({}, 503)});
    });

    // Stop all running servers after the tests
    after(function (done) {
        commander.redis.hack();
        commander.stopAll(done);
    });

    describe('Domain matching, single backends', function () {
        describe('#alone-simple-domain', function () {
            host('simple').connects('http://localhost:8201');

            host('simple').gets(201);
            host('simple').heads(201);
            host('simple').options(201);
            host('simple').traces(201);
            host('simple').deletes(201);
            host('simple').posts({}, 201);
            host('simple').puts({}, 201);

            host.flush();
        });

        describe('#multiple-simple-domains at a given time', function () {
            host('simple').connects('http://localhost:8201');
            host('foo.bar').connects('http://localhost:8202');
            host('a.b.c.d.e.f.g.h.i.j.k.l.m').connects('http://localhost:8203');

            host('simple').gets(201);
            host('foo.bar').gets(202);
            host('a.b.c.d.e.f.g.h.i.j.k.l.m').gets(203);

            host.flush();
        });

        describe('#single-wildcard', function () {
            host('*.foo.bar').connects('http://localhost:8201');

            host('test.foo.bar').gets(201);
            host('pipo.foo.bar').gets(201);
            host('foo.bar').gets(400);

            host.flush();
        });

        describe('#single-wildcard-short-domain', function () {
            host('*.foo').connects('http://localhost:8201');

            host('bar.foo').gets(201);
            host('foo.bar').gets(400);
            host('foo').gets(400);

            host.flush();
        });

        describe('#wildcard-priority', function () {
            host('*.foo.bar').connects('http://localhost:8201');
            host('foo.bar').connects('http://localhost:8202');
            host('pipo.foo.bar').connects('http://localhost:8203');
            host('*.baz.foo.bar').connects('http://localhost:8204');

            host('test.foo.bar').gets(201);
            host('foo.bar').gets(202);
            host('pipo.foo.bar').gets(203);
            host('qux.baz.foo.bar').gets(204);
            host('qux.bix.foo.bar').gets(201);
            host('qux.bix.bar.foo').gets(400);

            host.flush();
        });

        describe('#wildcard-depth', function () {
            host('*.quux').connects('http://localhost:8201');
            host('*.qux.quux').connects('http://localhost:8202');
            host('*.baz.qux.quux').connects('http://localhost:8203');
            host('*.bar.baz.qux.quux').connects('http://localhost:8204');
            host('foo.bar.baz.qux.quux').connects('http://localhost:8205');
            host('*.foo.bar.baz.qux.quux').connects('http://localhost:8206');
            host('*.quuux.foo.bar.baz.qux.quux').connects('http://localhost:8207');

            host('too.deep.quuux.foo.bar.baz.qux.quux').gets(206);
            host('too.deep.foo.bar.baz.qux.quux').gets(206);
            host('foo.bar.baz.qux.quux').gets(205);
            host('bar.bar.baz.qux.quux').gets(204);
            host('foo.baz.qux.quux').gets(203);
            host('foo.qux.quux').gets(202);
            host('foo.quux').gets(201);

            host.flush();
        });

    });

    describe('Multi backends', function () {
        describe('#alone-simple-domain', function () {
            host('foobar').connects(['http://localhost:8201', 'http://localhost:8202', 'http://localhost:8203']);

            for (var x = 0; x < 20; x++) {
                host('foobar').gets('201-203');
            }

            host.flush();

        });

        describe('#absent-simple-domain', function () {
            host('simple').gets(400);
        });

        describe('#one-of-the-backends-is-down', function () {
            host('simple').connects(['http://localhost:8201', 'http://localhost:15000']);

            // Let's try to beat the odds...
            var madeFail;
            for (var x = 0; x < 20; x++) {
                /*jshint loopfunc: true */
                host('simple').gets(function (response) {
                    // If we haven't hit the failing backend yet, and we have a failing code then mark as failed
                    if (!madeFail && (response === 502)) {
                        madeFail = true;
                    } else {
                        // Otherwise, by all means we should get a normal response code
                        expect(response).to.eql(201);
                    }
                });
            }

            it('did hit the unbound backend once', function () {
                expect(madeFail).to.eql(true);
            });

            host.flush();
        });


        describe('#one-of-the-backends-is-failing', function () {
            host('simple').connects(['http://localhost:8201', 'http://localhost:8501']);

            // Let's try to beat the odds...
            var madeFail;
            for (var x = 0; x < 20; x++) {
                /*jshint loopfunc: true */
                host('simple').gets(function (response) {
                    // If we haven't hit the failing backend yet, and we have a failing code then mark as failed
                    if (!madeFail && (response === 501)) {
                        madeFail = true;
                    } else {
                        // Otherwise, by all means we should get a normal response code
                        expect(response).to.eql(201);
                    }
                });
            }

            it('did hit the unbound backend once', function () {
                expect(madeFail).to.eql(true);
            });

            host.flush();
        });
    });

    describe('Uploading 500MB to the server', function () {
        this.timeout(100000);
        host('simple').connects('http://localhost:8201');

        var stream = fs.createReadStream('/dev/urandom', {start: 0, end: 500000000});
        // var stream = fs.createReadStream('/Users/dmp/dev/dmp42/hipache/random', {start: 0, end: 100});

        // host('simple').puts('0123456478987878798789789', 201);
        host('simple').puts(stream, 201);

        host.flush();
    });



})();
