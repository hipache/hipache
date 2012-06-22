dotCloud proxy2
===============

What is it?
-----------

dotCloud proxy2 is a complete Proxy solution based on the node-http-proxy
library.

Features:

 * Multi-backend load-balancing
 * WebSocket
 * Custom HTML error pages
 * Backend health check
 * Multi-workers (each worker can handle multiple clients)
 * Remove/Add a frontend or a backend while running

Configuration
-------------

dotCloud proxy2 uses a Redis server to manage its configuration (and to share
its state across the multiple workers). You can use the Redis server to change
its configuration while it's running or simply check the health state of a
backend.

### Configure a frontend

The hostname is `www.dotcloud.com` and its vhost identifier is `mywebsite`:

    $ redis-cli rpush frontend:www.dotcloud.com mywebsite
    (integer) 1

My frontend has two backends:

    $ redis-cli rpush frontend:www.dotcloud.com http://1.2.3.4:80
    (integer) 2
    $ redis-cli rpush frontend:www.dotcloud.com http://1.2.3.5:80
    (integer) 3

Let's review the configuration:

    $ redis-cli lrange frontend:www.dotcloud.com 0 -1
    1) "mywebsite"
    2) "http://1.2.3.4:80"
    2) "http://1.2.3.5:80"
