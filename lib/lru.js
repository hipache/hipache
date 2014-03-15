(function () {
    'use strict';
    var LruCache = require('lru-cache');

    var LruWrapper = function (size, ttl) {
        var lru;

        var passiveLru = {
            get: function () {},
            set: function () {},
            del: function () {}
        };

        var activeLru;

        Object.defineProperty(this, 'enabled', {
            get: function () {
                return lru === activeLru;
            },
            set: function (v) {
                if (v) {
                    lru = activeLru = activeLru || new LruCache({
                        max: size,
                        maxAge: ttl * 1000
                    });
                } else {
                    lru = passiveLru;
                }
            }
        });

        this.enabled = false;

        this.get = function (k) {
            return lru.get(k);
        };

        this.del = function (k) {
            return lru.del(k);
        };

        this.set = function (k, v) {
            return lru.set(k, v);
        };
    };

    module.exports = LruWrapper;
})();
