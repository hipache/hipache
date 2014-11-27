Hipache: a distributed HTTP and websocket proxy
===============================================

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]  [![Dependency Status][depstat-image]][depstat-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Code Climate][codeclimate-image]][codeclimate-url] [![Stories in Ready][waffle-image]][waffle-url]

WARNING
-----------

This is the documentation for `master`. If you are running Hipache release, you should look at the documentation on the `0.3` branch.


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
            "workers": 5,
            "maxSockets": 100,
            "deadBackendTTL": 30
        },
        "http": {
            "port": 80,
            "bind": ["127.0.0.1", "::1"]
        },
        "https": {
            "port": 443,
            "bind": ["127.0.0.1", "::1"],
            "key": "/etc/ssl/ssl.key",
            "cert": "/etc/ssl/ssl.crt"
        },
        "driver": "redis://:password@127.0.0.1:6379/0"
    }

 * __server__: generic server settings, like accesslog location, or number of workers
    * __server.accessLog__: location of the Access logs, the format is the same as
nginx. Defaults to `/var/log/hipache/access.log` if not specified.
    * __server.workers__: Number of workers to be spawned. You need to request to have at least 1 worker, as the
master process does not serve any request. Defaults to `10` if not specified.
    * __server.maxSockets__: The maximum number of sockets which can be opened on each backend (per worker). Defaults to `100` if not specified.
    * __server.deadBackendTTL__: The number of seconds a backend is flagged as
'dead' before retrying to proxy another request to it (doesn't apply if you are using a third-party health checker). Defaults to `30`.
 * __http__: specifies on which ips/ports hipache will listen for http traffic. By default, hipache listens only on 127.0.0.1:80
    * __http.port__: port to listen to for http. Defaults to `80`.
    * __http.bind__: IPv4 (or IPv6) address, or addresses to listen to. You can specify a single ip, an array of ips, or an array of objects `{address: IP, port: PORT}` if you want to use a specific port on a specific ip. Defaults to `127.0.0.1`.
 * __https__: specifies on which ips/ports hipache will listen for https traffic. By default, hipache doesn't listens for https traffic.
    * __https.port__: port to listen to for https. Defaults to `443`.
    * __https.key__: path to key file to use. No default.
    * __https.passphrase__: optional passphrase for the key file.
    * __https.cert__: path to certificate file to use. No default.
    * __https.ca__: optional path to additional CA file to serve. Might be a string, or an array.
    * __https.bind__: similarly to http.bind, you can specific a single ip, an array of ip, or an array of objects to override the port, key/cert/ca files on a per-ip basis.
 * __driver__: Redis url to connect to for dynamic vhost configurations. If you want a master/slave Redis, specify a second url for the master, eg: `driver: ["redis://slave:port", "redis://master:port"]`. More generally, the driver syntax is: `redis://:password@host:port/database#prefix` - all parameter are optional, hence just `redis:` is a valid driver uri. More infos about drivers in [lib/drivers](https://github.com/dotcloud/hipache/tree/master/lib/drivers). You can omit this entirely to use the local redis on the default port, which is the default.
 * __user__: if starting as root (which you might do if you want to use a privileged port), will drop root privileges as soon as it's bound. Defaults to `www-data`. Note that you MUST specify a user if you start hipache as root. You can specify `user: root` if you don't mind (strongly discouraged!). You can use either user names or ids.
 * __group__: if starting as root, will downgrade group to this. If left empty, will try to downgrade to a group named after the specified `user`. Defaults to `www-data`.

### 3. Spawning

From the shell (defaults to using the `config/config.json` file):

    $ hipache

If you use a privileged port (eg: 80):

    $ sudo hipache

If you want to use a specific configuration file:

    $ hipache --config path/to/someConfig.json

If you want to just test a specific configuration file:

    $ hipache --dry --config path/to/someConfig.json

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
running, and have that state shared across workers and even across Hipache instances.

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

Hipache supports SSL for "regular" requests as well as WebSocket upgrades.

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

[travis-url]: http://travis-ci.org/hipache/hipache
[travis-image]: https://secure.travis-ci.org/hipache/hipache.png?branch=master

[coveralls-url]: https://coveralls.io/r/dotcloud/hipache
[coveralls-image]: https://coveralls.io/repos/dotcloud/hipache/badge.png?branch=master

[depstat-url]: https://david-dm.org/hipache/hipache
[depstat-image]: https://david-dm.org/hipache/hipache.png

[codeclimate-url]: https://codeclimate.com/github/dotcloud/hipache
[codeclimate-image]: https://codeclimate.com/github/dotcloud/hipache.png

[waffle-url]: https://waffle.io/hipache/hipache
[waffle-image]: https://badge.waffle.io/hipache/hipache.png?label=in%20progress&title=Ready
