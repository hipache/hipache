Hipache: HTTP Proxy
===================

What is it?
-----------

Hipache is a complete Proxy solution based on the
node-http-proxy library.

It currently powers most of the traffic served by thousands of applications
hosted on the dotCloud platform.

Configuration
-------------

### 1. Configuring the server (config.json)

dotCloud proxy2 uses a Redis server to manage its configuration (and to share
its state across the multiple workers). You can use the Redis server to change
its configuration while it's running or simply check the health state of a
backend.

    {
        "server": {
            "accessLog": "/var/log/hipache_access.log",
            "port": 80,
            "workers": 5,
            "maxSockets": 100,
            "deadBackendTTL": 30,
            "https": {
                "port": 443,
                "key": "/etc/ssl/ssl.key",
                "cert": "/etc/ssl/ssl.crt"
            }
        },
        "redis": {
            "port": 6379,
            "host": "127.0.0.1"
        }
    }

* __server.accessLog__: location of the Access logs, the format is the same as
nginx
* __server.port__: Port to listen to (HTTP)
* __server.workers__: Number of workers to be spawned (specify at least 1, the
master process does not serve any request)
* __server.maxSockets__: The maximum number of sockets which can be opened on
each backend (per worker)
* __server.deadBackendTTL__: The number of seconds a backend is flagged as
`dead' before retrying to proxy another request to it
* __server.https__: SSL configuration (omit this section to disable HTTPS)
* __redis__: Redis configuration (host & port)

__Managing multiple configuration files:__

The default configuration file is `config.json`. It's possible to have
different configuration files named `config_<suffix>.json`. The suffix is got
from an environment variable called `SETTINGS_FLAVOR`.

For instance, here is how to spawn the server with the `config_test.json`
configuration file in order to run the tests.

    $ SETTINGS_FLAVOR=test node apps.json


### 2. Configuring a vhost (redis)

All the configuration is managed through Redis. This makes it possible to
update the configuration dynamically and gracefully while the server is
running.

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


Features
--------

### Multi backend: load-balancing and health check

As seen in the example above, multiple backends can be attached to a frontend.

All requests coming to the frontend are load-balanced across the multiple
backend. If a backend stops responding, it will be flagged as dead for a
configurable amount of time. The dead backend will be temporary removed from
the load-balancing rotation.

### Memory monitoring

Hipache uses the cluster module (included in NodeJS). The master process is in
charge of spawning workers and monitoring them. Once a worker dies, the master
spawns a new one.

The current version of Hipache suffers from memory leaks (mostly because of
the external libraries it relies on). More profiling will be done in order to
identify the cause and improve the memory consumption.

Meanwhile, in order to workaround these memory issues, each worker monitors its
memory usage. If the memory reaches a certain amount of memory allocated, the
worker stop accepting new connections and waits for the active one to be
terminated. Then it stops and a new worker is spawned.

### And more...

* Dynamic configuration
* Custom HTML error pages
* Websocket
* SSL


Future improvements
-------------------

### Configuration adapters

While the core of the configuration relies on Redis, it makes it possible to
easily write configuration adapters.

A plain text configuration file will be the first one to be implemented.

### Caching the Redis lookups

For the moment, Redis is accessed for each incoming request. Caching these
lookups will reduce the time spent to route a request.
