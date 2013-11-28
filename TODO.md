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


Configuration adapters
------------------------

While the core of the configuration relies on Redis, it is possible to
easily write any configuration adapters to provision the Redis.

A plain text configuration file will be the first one to be implemented: the
vhosts and backend will be replaced load from a json file to provision the
Redis.

A mechanism will allow to reload the configuration file gracefully while the
server is running.
