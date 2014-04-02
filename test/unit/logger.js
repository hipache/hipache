(function () {
    /*globals describe:false, it:false*/
    'use strict';

    var expect = require('chai').expect;
    var fs = require('fs');
    var AccessLogger = require('../../lib/accesslogger.js');

    describe('Logger', function () {
        describe('#creation', function () {
            it('err with undefined path', function (done) {
                var logger = new AccessLogger();
                logger.on('error', function (e) {
                    expect(e).to.be.instanceof(TypeError);
                    done();
                });
            });
            it('err trying to open a folder', function (done) {
                var logger = new AccessLogger('/tmp/');
                logger.on('error', function (e) {
                    expect(e.code).to.eql('EISDIR');
                    done();
                });
            });
            it('err trying to open file in nested non existent directory', function (done) {
                var logger = new AccessLogger('/tmp/whatever/again/dontexist/thing.log');
                logger.on('error', function (e) {
                    expect(e.code).to.eql('ENOENT');
                    done();
                });
            });
            it('err trying to open file with no permissions', function (done) {
                var pt = '/tmp/testnoperm.log';
                try {
                    fs.writeFileSync(pt, '');
                    fs.chmodSync(pt, '0400');
                } catch (e) {
                }
                var logger = new AccessLogger('/tmp/testnoperm.log');
                logger.on('error', function (e) {
                    expect(e.code).to.eql('EACCES');
                    done();
                });
            });
        });

        describe('#trying to log in the wrong state', function () {
            it('stream has been closed', function (done) {
                var logFile = '/tmp/testlogger.log';
                var logger = new AccessLogger(logFile);
                logger.stop();
                logger.log({});
                logger.on('error', function (e) {
                    expect(e).to.eql(new Error('write after end'));
                    done();
                });
            });
        });

        describe('#legit logging', function () {
            var logFile = '/tmp/testlogger.log';

            var logger;

            var clearUp = function () {
                if (fs.existsSync(logFile)) {
                    fs.unlinkSync(logFile);
                }
                if (logger) {
                    logger.stop();
                }
                logger = new AccessLogger(logFile);
            };

            // XXX is that really what we want?
            it('empty data', function (done) {
                var data = {};
                var expectedLine = '::ffff:undefined - - [NaN/undefined/NaN:NaN:NaN:NaN +0000] ' +
                        '"undefined undefined HTTP/undefined" undefined 0 "" "" "undefined"' +
                        ' NaN NaN\n';

                clearUp();
                logger.log(data);

                fs.readFile(logFile, 'utf8', function (err, data) {
                    expect(data).to.eql(expectedLine);
                    done();
                });
            });

            it('legit data', function (done) {
                var data = {
                    remoteAddr: '::1',
                    currentTime: 1392511390963,
                    totalTimeSpent: 11,
                    backendTimeSpent: 9,
                    method: 'GET',
                    url: '/',
                    httpVersion: '1.1',
                    statusCode: 200,
                    socketBytesWritten: 3236,
                    userAgent: 'curl/7.30.0',
                    virtualHost: 'mywebsite'
                };

                clearUp();
                logger.log(data);

                var expectedLine = '::1 - - [16/Feb/2014:00:43:10 +0000] ' +
                  '"GET / HTTP/1.1" 200 3236 "" "curl/7.30.0" ' +
                  '"mywebsite" 0.011 0.009\n';

                fs.readFile(logFile, 'utf8', function (err, data) {
                    expect(data).to.eql(expectedLine);
                    done();
                });
            });

        });

        // Should test SIGUSR1, ending the logging process
    });

})();
