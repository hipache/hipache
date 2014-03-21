(function () {
    /*globals describe:false, it:false*/
    'use strict';

    var expect = require('chai').expect;

    var LruCache = require('../../lib/lru.js');

    describe('Lru', function () {
        describe('#dumb lru', function () {
            it('Get, set, del', function () {
                var lru = new LruCache();
                expect(lru.get('blank')).to.eql(undefined);
                expect(lru.set('blank', 'whatever')).to.eql(undefined);
                expect(lru.get('blank')).to.eql(undefined);
                expect(lru.del('blank')).to.eql(undefined);
                expect(lru.get('blank')).to.eql(undefined);
            });
        });

        describe('#real lru', function () {
            it('Simple get, set, del', function () {
                var lru = new LruCache();
                lru.enabled = true;
                expect(lru.get('blank')).to.eql(undefined);

                [
                    'whatever', 'whateverelse', undefined, null, false, -10,
                    Infinity, new Date(), {some: 'object'}, ['some', 'array']
                ].forEach(function (value) {
                    expect(lru.set('blank', value)).to.eql(true);
                    expect(lru.get('blank')).to.eql(value);
                });

                var someRef = {some: 'ref'};
                expect(lru.set('blank', someRef)).to.eql(true);
                delete someRef.some;
                someRef.thing = 'foo';
                expect(lru.get('blank')).to.eql(someRef);

                expect(lru.del('blank')).to.eql(undefined);
                expect(lru.get('blank')).to.eql(undefined);
            });
        });

        describe('#real lru limits ', function () {
            it('Reaching the number of objects limits', function () {
                var lru = new LruCache();
                lru.enabled = {size: 1};
                for (var x = 0; x < 2; x++) {
                    lru.set(x, '0123456789');
                    expect(lru.get(x)).to.eql('0123456789');
                }
                expect(lru.get(0)).to.eql(undefined);
                expect(lru.get(1)).to.eql('0123456789');
            });

            it('Reaching the ttl', function (done) {
                var ttl = 0.05;
                var lru = new LruCache();
                lru.enabled = {size: 0, ttl: ttl};
                lru.set('ttltest', '0123456789');
                expect(lru.get('ttltest')).to.eql('0123456789');
                setTimeout(function () {
                    expect(lru.get('ttltest')).to.eql(undefined);
                    done();
                }, (ttl * 1000) + 1);
            });
        });
    });
})();
