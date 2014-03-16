(function () {
    'use strict';
    var LruCache = require('lru-cache');

    var LruWrapper = function () {
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
                        max: v.size || 0,
                        maxAge: (v.ttl || 0) * 1000
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
