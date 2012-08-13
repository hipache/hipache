
'use strict';

/**
 * This module is a helper to setUp and tearDown the tests.
 * This is not a Test module.
 */

var child_process = require('child_process'),
    http = require('http'),
    util = require('util'),
    redis = require('redis'),
    redisClient = null,
    count = null;


exports.setUp = function () {
    redisClient = redis.createClient();
    redisClient.on('error', function (err) {
        util.log('RedisError ' + err + ' (is redis-server running?)');
    });
    count = 0;
};

exports.tearDown = function () {
    redisClient.end();
};

exports.addFrontend = function (frontend, backends, callback) {
    // make sure the vhost does not exist
    exports.removeFrontend(frontend);
    backends.splice(0, 0, frontend);
    redisClient.rpush('frontend:' + frontend, backends, function () {
        if (callback !== undefined) {
            callback();
        }
    });
};

exports.removeFrontend = function (frontend) {
    redisClient.del('frontend:' + frontend);
    redisClient.del('dead:' + frontend);
};

exports.removeMatchedFrontend = function (frontendPattern) {
    var removePattern = function (pattern) {
        redisClient.keys(pattern, function (err, replies) {
            replies.forEach(function (reply) {
                redisClient.del(reply);
            });
        });
    };
    removePattern('frontend:' + frontendPattern);
    removePattern('dead:' + frontendPattern);
};

exports.requestFrontend = function (testObject, frontend, expectedStatusCode, callback) {
    var opts = {
        host: '127.0.0.1',
        port: 1080,
        headers: {'HOST': frontend}
    };
    var req = http.get(opts, function (res) {
        testObject.ok(res.statusCode === expectedStatusCode,
            '#' + count + ' Expected status code: ' + expectedStatusCode + ' (got: ' + res.statusCode + ' on "' + frontend + '")');
        if (callback !== undefined) {
            callback();
        }
    });
    req.on('error', function (error) {
        testObject.ok(false, '#' + count + ' Failed to proxify (error: ' + error + ')');
    });
    count++;
};
