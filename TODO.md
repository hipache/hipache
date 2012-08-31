Future improvements
===================

Since the dotCloud platform uses Hipache to route its production traffic, the
project is in constant improvement. This document gives some information about
what you can expect to see moving in the next future on the project.


Configuration validator
-----------------------

For the moment, any value can be passed in the configuration file and if you
omit a value parameter, the server will not start.

The idea is to validate the format of the configuration file at startup and to
fallback on default value when the parameter does not exist.


Configuration adaptaters
------------------------

While the core of the configuration relies on Redis, it is possible to
easily write any configuration adapters to provision the Redis.

A plain text configuration file will be the first one to be implemented: the
vhosts and backend will be replaced load from a json file to provision the
Redis.

A mechanism will allow to reload the configuration file gracefully while the
server is running.


Passive health checks
---------------------

The current health checking system is active. The backend is checked when a
request comes to it. This mechanism has some caveats such as a latency when
a backend dies.

The idea would be to implement an passive health checking mechanism to
constantly test all backends (using the OPTIONS HTTP method like HA-proxy
implements its "httpchk" option).

The current architecture with Redis makes it possible to keep the active health
checks system external from the Core of Hipache. This system can be easily
run on another machine or a separate process, it will just need to access the
Redis to flag a backend as dead.


Cache the Redis lookup
----------------------

For the moment, Redis is accessed for each incoming request. Caching these
lookups will reduce the time spent to route a request.

The idea is to use a LRU cache to control the size of the memory cache and to
keep in cache only the frontend the most accessed.
