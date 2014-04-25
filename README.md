Hipache: a distributed HTTP and websocket proxy
===============================================

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]  [![Dependency Status][depstat-image]][depstat-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Code Climate][codeclimate-image]][codeclimate-url]
[![Stories in Ready][waffle-image]][waffle-url]

What is it?
-----------

Hipache (pronounce `hɪ'pætʃɪ`) is a distributed proxy designed to route high volumes of http and
websocket traffic to unusually large numbers of virtual hosts, in a highly
dynamic topology where backends are added and removed several times per second.
It is particularly well-suited for PaaS (platform-as-a-service) and other
environments that are both business-critical and multi-tenant.

Hipache was originally developed at [dotCloud](http://www.dotcloud.com), a
popular platform-as-a-service, to replace its first-generation routing layer
based on a heavily instrumented nginx deployment. It currently serves
production traffic for tens of thousands of applications hosted on dotCloud.
Hipache is based on the node-http-proxy library.


Run it!
-------

### 1. Installation

From the shell:

    $ npm install hipache -g

*The '-g' option will make the 'hipache' bin-script available system-wide (usually linked from '/usr/local/bin')*


### 2. Configuration (config.json)

Basic Hipache configuration is described in a json file. For example:

    {
        "server": {
            "accessLog": "/var/log/hipache_access.log",
            "port": 80,
            "workers": 5,
            "maxSockets": 100,
            "deadBackendTTL": 30,
            "address": ["127.0.0.1", "::1"],
            "https": {
                "port": 443,
                "key": "/etc/ssl/ssl.key",
                "cert": "/etc/ssl/ssl.crt"
            }
        },
        "driver": "redis://:password@127.0.0.1:6379/0"
    }

* __server.accessLog__: location of the Access logs, the format is the same as
nginx
* __server.port__: Port to listen to (HTTP)
* __server.workers__: Number of workers to be spawned (specify at least 1, the
master process does not serve any request)
* __server.maxSockets__: The maximum number of sockets which can be opened on
each backend (per worker)
* __server.deadBackendTTL__: The number of seconds a backend is flagged as
`dead' before retrying to proxy another request to it (doesn't apply if you are using a third-party health checker)
* __server.address__: IPv4 and IPv6 Addresses listening (HTTP and HTTPS)
* __server.https__: SSL configuration (omit this section to disable HTTPS)
* __driver__: Redis url (you can omit this entirely to use the local redis on the default port). If you want a master/slave Redis, specify a second url for the master, eg: `driver: ["redis://slave:port", "redis://master:port"]`. More generally, the driver syntax is: `redis://:password@host:port/database#prefix` - all parameter are optional, hence just `redis:` is a valid driver uri. More infos about drivers in [lib/drivers](https://github.com/dotcloud/hipache/tree/master/lib/drivers).

### 3. Spawning

From the shell (defaults to using the `config/config.json` file):

    $ hipache

If you use a privileged port (eg: 80):

    $ sudo hipache

If you want to use a specific configuration file:

    $ hipache --config path/to/someConfig.json

__Managing multiple configuration files:__

The default configuration file is `config/config.json`. It's possible to have
different configuration files named `config_<suffix>.json`, where the suffix
is the value of an environment variable named `SETTINGS_FLAVOR`.

For instance, here is how to spawn the server with the `config_test.json`
configuration file in order to run the tests.

    $ SETTINGS_FLAVOR=test hipache


### 4. Configuring a vhost (redis)

All vhost configuration is managed through Redis. This makes it possible to
update the configuration dynamically and gracefully while the server is
running, and have that state shared accross workers and even accross Hipache instances.

It also makes it simple to write configuration adapters. It would be trivial
to load a plain text configuration file into Redis (and update it at runtime).

Different configuration adapters will follow, but for the moment you have to
provision the Redis manually.

Let's take an example, I want to proxify requests to 2 backends for the
hostname www.dotcloud.com. The 2 backends IP are 192.168.0.42 and 192.168.0.43
and they serve the HTTP traffic on the port 80.

`redis-cli` is the standard client tool to talk to Redis from the terminal.

Here are the steps I will follow:

1. __Create__ the frontend and associate an identifier

        $ redis-cli rpush frontend:www.dotcloud.com mywebsite
        (integer) 1

The frontend identifer is `mywebsite`, it could be anything.

2. __Associate__ the 2 backends

        $ redis-cli rpush frontend:www.dotcloud.com http://192.168.0.42:80
        (integer) 2
        $ redis-cli rpush frontend:www.dotcloud.com http://192.168.0.43:80
        (integer) 3

3. __Review__ the configuration

        $ redis-cli lrange frontend:www.dotcloud.com 0 -1
        1) "mywebsite"
        2) "http://192.168.0.42:80"
        3) "http://192.168.0.43:80"

While the server is running, any of these steps can be re-run without messing
up with the traffic.

### 5. OS integration

__Upstart__

Copy upstart.conf to __/etc/init/hipache.conf__.

Then you can use:

```
start hipache
stop hipache
restart hipache
```

The configuration file used is `/etc/hipache.json`.

Features
--------

### Load-balancing across multiple backends

As seen in the example above, multiple backends can be attached to a frontend.

All requests coming to the frontend are load-balanced across all healthy
backends.

The backend to use for a specific request is determined randomly. Subsequent
requests coming from the same client won't necessarily be routed to the same
backend (since backend selection is purely random).

### Dead backend detection

If a backend stops responding, it will be flagged as dead for a
configurable amount of time. The dead backend will be temporarily removed from
the load-balancing rotation.

### Multi-process architecture

To optimize response times and make use of all your available cores, Hipache
uses the cluster module (included in NodeJS), and spreads the load across
multiple NodeJS processes. A master process is in charge of spawning workers
and monitoring them. When a worker dies, the master spawns a new one.

### Memory monitoring

The memory footprint of Hipache tends to grow slowly over time, indicating
a probable memory leak. A close examination did not turn up any memory leak
in Hipache's code itself; but it doesn't prove that there is none. Also,
we did not investigate (yet) thoroughly the code of Hipache's external
dependencies, so the leaks could be creeping there.

While we profile Hipache's memory to further reduce its footprint, we
implemented a memory monitoring system to make sure that memory use doesn't
go out of bounds. Each worker monitors its memory usage. If it crosses
a given threshold, the worker stops accepting new connections, it lets
the current requests complete cleanly, and it stops itself; it is then
replaced by a new copy by the master process.

### Dynamic configuration

You can alter the configuration stored in Redis at any time. There is no
need to restart Hipache, or to signal it that the configuration has changed:
Hipache will re-query Redis at each request. Worried about performance?
We were, too! And we found out that accessing a local Redis is helluva fast.
So fast, that it didn't increase measurably the HTTP request latency!

### WebSocket

Hipache supports the WebSocket protocol. It doesn't do any fancy handling
on its own and relies entirely on NodeJS and node-http-proxy.

### SSL

If provided with a SSL private key and certificate, Hipache will support SSL
connections, for "regular" requests as well as WebSocket upgrades.

### Custom HTML error pages

When something wrong happens (e.g., a backend times out), or when a request
for an undefined virtual host comes in, Hipache will display an error page.
Those error pages can be customized.

### Wildcard domains support

When adding virtual hosts in Hipache configuration, you can specify wildcards.
E.g., instead (or in addition to) www.example.tld, you can insert
*.example.tld. Hipache will look for an exact match first, and then for a
wildcard one up to 5 subdomains deep, e.g. foo.bar.baz.qux.quux will attempt to
match itself first, then *.bar.baz.qux.quux, then *.baz.qux.quux, etc.

### Active Health-Check

Even though Hipache support passive health checks, it's also possible to run
active health checks. This mechanism requires to run an external program (see third-party softwares below).


Third party softwares of interest
-------------------

Health-checkers:

 * [hipache-hchecker (golang)](https://github.com/samalba/hipache-hchecker)
 * [hipcheck (node.js)](https://github.com/runnable/hipcheck).

A web interface to manage vhosts:

 * [airfield](https://github.com/emblica/airfield)

[npm-url]: https://npmjs.org/package/hipache
[npm-image]: https://badge.fury.io/js/hipache.png

[travis-url]: http://travis-ci.org/dotcloud/hipache
[travis-image]: https://secure.travis-ci.org/dotcloud/hipache.png?branch=master

[coveralls-url]: https://coveralls.io/r/dotcloud/hipache
[coveralls-image]: https://coveralls.io/repos/dotcloud/hipache/badge.png?branch=master

[depstat-url]: https://david-dm.org/dotcloud/hipache
[depstat-image]: https://david-dm.org/dotcloud/hipache.png

[codeclimate-url]: https://codeclimate.com/github/dotcloud/hipache
[codeclimate-image]: https://codeclimate.com/github/dotcloud/hipache.png

[waffle-url]: https://waffle.io/dotcloud/hipache
[waffle-image]: https://badge.waffle.io/dotcloud/hipache.png?label=in%20progress&title=Ready
