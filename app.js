
'use strict';

var fs = require('fs'),
    cluster = require('cluster'),
    util = require('util'),
    master = require('./lib/master'),
    worker = require('./lib/worker');


var config = (function (path) {
    var data;

    if (process.env.SETTINGS_FLAVOR !== undefined) {
        path = path.replace(/\.json$/, '_' + process.env.SETTINGS_FLAVOR + '.json');
    }
    util.log('Loading config from ' + path);
    data = fs.readFileSync(path);
    return JSON.parse(data);
}(__dirname + '/config.json'));

if (cluster.isMaster) {
    // Run the master
    master(config);
    util.log('Server is running. ' + JSON.stringify(config.server));
} else {
    // Run the worker
    worker(config);
}
