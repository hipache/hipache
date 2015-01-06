(function () {
    /*globals describe:false, before:false, after:false*/
    'use strict';

    var npmlog = require('npmlog');
    var rimraf = require('rimraf');
    var os = require('os');

    if (process.env.NO_ETCD) {
        npmlog.error('Test', 'No etcd server on this machine! No tests, then.');
        return;
    }

    // Useful if you want to see servers talk to you
    // require('npmlog').level = 'silly';

    // var expect = require('chai').expect;

    var Driver = require('../../lib/drivers/etcd');
    var Server = require('../fixtures/servers/etcd');
    var testReading = require('./driver-test-reading');


    var s1 = new Server();
    var serverTemp = os.tmpdir() + '/hipache-etcd-test';

    // Start all servers beforehand
    before(function (done) {
        // For some reason, etcd needs time to take-off the ground :(
        s1.start([
            '-bind-addr=127.0.0.1:8001',
            '-addr=127.0.0.1:8001',
            '-peer-bind-addr=127.0.0.1:8011',
            '-peer-addr=127.0.0.1:8011',
            '-name=testing-hipache',
            '-data-dir=' + serverTemp
        ]).once('started', function () {
            setTimeout(function () {
                done();
            }, 1500);
        });
    });

    // Shutdown pips!
    after(function (done) {
        s1.stop().once('stopped', function() {
            // Clean-up data folder
            rimraf(serverTemp, done);
        });
    });

    describe('Etcd', function () {
        [
            ['etcd://:8001'],
            ['etcd://:8001/#someprefix']
        ].forEach(function (setup) {
            describe(setup, function () {
                testReading(Driver, setup);
            });
        });
    });
})();
