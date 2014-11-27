Hipache data providers
======================

Mainline Hipache uses Redis to store and retrieve routing information.
This is the default, have been optimized and tested a lot, and you should really stick with that if you are just starting or don't wanna know.

That being said, it's possible to use alternative storage systems if you [bla insert random reason].

Alternatives
------------

Right now, we provide implementations and some tests for:

 * etcd (though: no ssl client cert auth support)
 * memcached (though: no sasl support)

Both of these should be considered highly experimental:

 * they might not work
 * stored data organization may change without notice with an upcoming version
 * performance may very well be terrible
 * you have been warned :-)


How to use...
-------------

Etcd: `npm install -g node-etcd` and in your config file: `{"driver": "etcd://host:port"}`

Memcached: `npm install -g memcached` and in your config file: `{"driver": "memcached://host:port"}`


Configuration overview
----------------------

Specifying which driver / options to use is a matter of writing an URL (in the configuration file):

 * `{"driver": "protocol://user:password@host:port/dbname#prefix"}`
 * for drivers that can work as master / slave (eg: redis), and if you want write operations to go to a specific server, specify an array of servers - the last one will be used exclusively for write operations and the first one for reads `{"driver": ["redis://:slaveport/", "redis://masterhost:masterport/"]}`
 * for drivers that support clusters of servers (eg: memcached), specify the cluster list: `{"driver": ["memcached://mainhost/", "memcached://otherhost/"]}`
 * for drivers that optionnaly support SSL (eg: etcd), add an extra "s" at the end of the protocol name: `{"driver": "etcds://host:port"}`

Examples using Redis:

 * Simplest form: `{"driver": "redis:"}`
 * Specifying an host and port: `{"driver": "redis://host:port"}`
 * And a password: `{"driver": "redis://:password@host:port"}`
 * Using a specific database: `{"driver": "redis:///1"}`

Other examples:

 * `{"driver": ["memcached://host:port", "memcached://otherhost:port"]}`
 * `{"driver": "etcd://host:port"}`

If the driver supports a "database" concept (eg: Redis), you can specify it using the path:

 * `{"driver": "redis:///1"}`

You can also specify prefixes that will be prepended to keys using hashes:
 * `{"driver": "redis:///1#someprefix"}`

... what you can't do
---------------------

No, you can't mix different drivers.

No, we are not adding optional drivers dependencies as Hipache dependencies - you *have* to `npm install (-g)` the driver dep manually.

Rolling your own
----------------

You need to:

 * create a file in this folder named "myprovider.js", where `myprovider` is the protocol name that will be used in driver urls
 * create an instanciable class in that file that inherits `IDriver`

Below is the bare minimum you need to get started:

```
(function () {
    'use strict';
    var util = require('util');
    var IDriver = require('../utils/idriver');

    var MyProvider = function () {
        IDriver.apply(this, arguments);
    };

    util.inherits(MyProvider, IDriver);

    module.exports = MyProvider;
})();

```

Now, that will throw miserably, because you MUST implement at least the following methods:

1. `read = function (hosts, callback)` a method that will asynchronously retrieve the following array and feed it to callback:

```
[
    ['backends for domain1', ...],
    ['backends for domain2', ...],
    [...],
    ['dead backends', ...],
]
```

2. `mark = function (frontend, id, url, len, ttl)` a method to mark a given backend as dead.

You SHOULD BETTER send a `IDriver.READY` event when your provider is ready.

You SHOULD catch all your exceptions/errors and instead send an `IDriver.ERROR` event.

You SHOULD implement the `create` and `add` methods to ease testing.

You MAY additionally implement the `destructor()` method if you want to do some cleanup/closing when we shutdown workers.

Obviously, you might require additional dependencies - don't add them here, but instead try / catch your require and log some information about what the user need to install to have your thing run.

You have at your disposal `this.drivers`, an array that contains urls objects describing what endpoints the user requested (these are nodejs' urls).

Finally, if you want your data provider to be added here, you need to add tests (see redis) and have it pass them.


Future
------

If there is enough people using at least an alternate driver, we will move to a separate plugin architecture, so that third-parties can implement and publish their own driver independently.
