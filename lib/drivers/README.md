Hipache data providers
======================

Mainline Hipache uses Redis to store and retrieve routing information.
This is the default, have been optimized and tested a lot, and you should really stick with that if you are just starting or don't wanna know.

That being said, it's possible to use alternative storage systems if you [bla insert random reason].

Alternatives
------------

Right now, we provide implementations and some tests for:

 * etcd (no ssl client cert auth support)
 * memcached (no sasl support)

Both of these should be considered highly experimental for now:

 * stored data organization may change without notice with an upcoming version
 * performance may very well be terrible
 * you have been warned :-)

Configuration overview
----------------------

Specifying which driver / options to use is a matter of writing an URL (in the configuration file):

 * `{"driverUrl": "protocol://user:password@host:port/dbname"}`
 * if you want write operations to get to a specific server, add `{"masterUrl": "protocol://user:password@host:port/dbname"}` (it's up to the driver to implement master writes or not)

Examples using Redis:

 * Simplest form: `{"driverUrl": "redis://"}`
 * Specifying an host and port: `{"driverUrl": "redis://host:port"}`
 * And a password: `{"driverUrl": "redis://:password@host:port"}`
 * Using a specific database: `{"driverUrl": "redis:///1"}`

Other examples:

 * `{"driverUrl": "memcached://host:port"}`
 * `{"driverUrl": "etcd://host:port"}`

If the driver supports a "database" concept (eg: Redis), you can specify it using the path:

 * `{"driverUrl": "redis:///1"}`

You can also specify prefixes that will be prepended to keys using hashes (if you are the kind of guy who customize your PC with flame stickers :-)):
 * `{"driverUrl": "redis:///1#someprefix"}`



Rolling your own
----------------

You need to:

 * create a file in this folder named "myprovider.js", where myprovider is the protocol name that will be used by urls
 * create an instanciable class in that file that inherits IHipDriver

Below is the bare minimum you need to get started:

"""
(function () {
    'use strict';
    var util = require('util');
    var IHipDriver = require('./IHipDriver');

    var MyProvider = function () {
        IHipDriver.apply(this, arguments);
    };

    util.inherits(MyProvider, IHipDriver);

    module.exports = MyProvider;
})();

"""

Now, that will throw miserably, because you MUST implement at least the following methods:

1. `read = function (wholeHost, mainDomain, callback)` a method that will asynchronously retrieve the following array and feed it to callback:

"""
[
    ['backends for wholeHost', ...],
    ['backends for mainDomain', ...],
    ['fallback backends', ...],
    ['dead backends', ...],
]
"""

2. `mark = function (frontend, id, url, len, ttl)` a method to mark a given backend as dead.

You SHOULD BETTER send a `IHipDriver.READY` event when your provider is ready.

You SHOULD catch all your exceptions/errors and instead send a `IHipDriver.ERROR` event.

You SHOULD implement the `create` and `add` methods to ease testing.

You MAY additionnally implement the `destructor()` method if you want to do some cleanup/closing when we shutdown workers.

You have at your disposal `this.slave` and `this.master` urls to access information about the servers you need to instanciate (these are nodejs' urls).

`this.slave` is always provided. `this.master` is optional, and is meant to have a different backend for write operations.

Finally, if you want your data provider to be added here, you need to add tests (see redis) and have it pass them.
