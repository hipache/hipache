Runnables Hipache: a distributed HTTP and websocket proxy
=========================================================

Basically the same thing as normal hipache, just Runnablier

Changes:

in lib/cache.js

```
in Cache.prototype.getBackendFromHostHeader, the header host is parsed to check for a port
if a port isn't specified in the subdomain, it's concatenated with it

```

in Dockerfile

```
remove redis and superviserD and run hipache as main command
also use config_runnable_io.json

```

in config_runnable_io.json

```
config for runnable.io

```