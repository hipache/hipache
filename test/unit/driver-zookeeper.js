(function () {
    /*globals describe:false, before:false, after:false*/
    'use strict';

    var npmlog = require('npmlog');
    var fs = require('fs');
    var spawn = require('child_process').spawn;

    if (process.env.NO_ZOOKEEPER) {
        npmlog.error('Test', 'No zookeeper server on this machine! No tests, then.');
        return;
    }

    // Useful if you want to see servers talk to you
    //require('npmlog').level = 'silly';

    // var expect = require('chai').expect;

    var Driver = require('../../lib/drivers/zookeeper');
    var Server = require('../fixtures/servers/zookeeper');
    var testReading = require('./driver-test-reading');

    var s1 = new Server();

    before(function (done) {
        fs.writeFile(process.env.HOME + '/zookeeper/zoo.cfg', ['tickTime=2000',
            'dataDir=' + process.env.HOME + '/zookeeper/data/', 'clientPort=2182'].join('\n'), function(err) {
            if(err) {
                npmlog.error('Test', 'Error writing zookeeper test config: ' + err);
            }
        });
        process.env.ZOO_LOG_DIR = process.env.HOME + '/zookeeper/';

        // Zookeeper needs time to take-off the ground :(
        s1.start(['start-foreground', process.env.HOME + '/zookeeper/zoo.cfg']).once('started', done);
    });

    after(function (done) {
        s1.stop().once('stopped', function(){
          spawn('/bin/rm', ['-rf', process.env.HOME + '/zookeeper/data/']);
          done();
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
