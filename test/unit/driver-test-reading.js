(function () {
    /*globals it:false, before:false, after:false*/
    'use strict';

    var expect = require('chai').expect;

    module.exports = function (Driver, url) {
        var red;

        before(function () {
            red = new Driver(url);
        });

        after(function () {
            red.destructor();
        });

        it('Domain with no match, no fallback', function (done) {
            red.read(['unmatched.com', '*'], function (err, data) {
                expect(data).to.eql([
                    [],
                    [],
                    []
                ]);
                done();
            });
        });

        it('Single domain with a backend', function (done) {
            red.create('domain.com', 'myvhost', function () {
                red.add('domain.com', 'backend:1234', function () {
                    red.read(['domain.com', '*'], function (err, data) {
                        expect(data).to.eql([
                            ['myvhost', 'backend:1234'],
                            [],
                            []
                        ]);
                        done();
                    });
                });
            });
        });

        it('Single domain with multiple backends', function (done) {
            red.add('domain.com', 'backend:4567', function () {
                red.read(['domain.com', '*'], function (err, data) {
                    expect(data).to.eql([
                        ['myvhost', 'backend:1234', 'backend:4567'],
                        [],
                        []
                    ]);
                    done();
                });
            });
        });

        it('Single domain with multiple backends and fallback', function (done) {
            red.create('*', 'supervhost', function () {
                red.add('*', 'backend:910', function () {
                    red.read(['domain.com', '*'], function (err, data) {
                        expect(data).to.eql([
                            ['myvhost', 'backend:1234', 'backend:4567'],
                            ['supervhost', 'backend:910'],
                            []
                        ]);
                        done();
                    });
                });
            });
        });

        it('Single domain with multiple backends and fallback plus dead', function (done) {
            red.mark('domain.com', 1, 'backend:4567', 2, 1, function () {
                red.read(['domain.com', '*'], function (err, data) {
                    expect(data).to.eql([
                        ['myvhost', 'backend:1234', 'backend:4567'],
                        ['supervhost', 'backend:910'],
                        [1]
                    ]);
                    done();
                });
            });
        });

        it('Single domain with multiple backends and fallback plus a second dead', function (done) {
            red.mark('domain.com', 5, 'backend:4567', 2, 1, function () {
                red.read(['domain.com', '*'], function (err, data) {
                    expect(data).to.eql([
                        ['myvhost', 'backend:1234', 'backend:4567'],
                        ['supervhost', 'backend:910'],
                        [1, 5]
                    ]);
                    done();
                });
            });
        });

        it('... let it expire', function (done) {
            // Now, let it expire
            setTimeout(function () {
                red.read(['domain.com', '*'], function (err, data) {
                    expect(data).to.eql([
                        ['myvhost', 'backend:1234', 'backend:4567'],
                        ['supervhost', 'backend:910'],
                        []
                    ]);
                    done();
                });
            }, 1500);
        });

    };

})();
