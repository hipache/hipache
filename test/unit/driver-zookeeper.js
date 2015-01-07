(function () {
    /*globals describe:false, before:false, after:false*/
    'use strict';

    var npmlog = require('npmlog');
    var fs = require('fs');
    var os = require('os');
    var rimraf = require('rimraf');

    if (process.env.NO_ZOOKEEPER) {
        npmlog.error('Test', 'No zookeeper server on this machine! No tests, then.');
        return;
    }

    // Useful if you want to see servers talk to you
    // require('npmlog').level = 'silly';

    // var expect = require('chai').expect;

    var Driver = require('../../lib/drivers/zookeeper');
    var Server = require('../fixtures/servers/zookeeper');
    var testReading = require('./driver-test-reading');

    var s1 = new Server();
    var serverTemp = os.tmpdir() + '/hipache-zookeeper-test';
    process.env.ZOO_LOG_DIR = serverTemp;
    process.env.ZOOPIDFILE = serverTemp + '.pid';

    before(function (done) {
        if (!fs.existsSync(serverTemp)){
            fs.mkdirSync(serverTemp);
        }
        fs.writeFile(serverTemp + '/zoo.cfg', ['tickTime=1000',
            'dataDir=' + serverTemp + '/data/', 'clientPort=2182'].join('\n'), function(err) {
            if(err) {
                npmlog.error('Test', 'Error writing zookeeper test config: ' + err);
                return;
            }
            // Zookeeper needs time to take-off the ground :(
            s1.start([serverTemp + '/zoo.cfg']).once('stopped', function () {
                done();
            });
        });
    });

    after(function (done) {
        s1.stop().once('stopped', function () {
            rimraf(serverTemp, done);
        });
    });

    describe('Zookeeper', function () {
        [
            ['zookeeper://:2182'],
            ['zookeeper://:2182/#someprefix']
        ].forEach(function (setup) {
            describe(setup, function () {
                testReading(Driver, setup);
            });
        });
    });
})();
