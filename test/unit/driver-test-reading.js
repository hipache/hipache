(function () {
    /*globals it:false, afterEach:false*/
    'use strict';

    var expect = require('chai').expect;

    module.exports = function (Driver, url) {
        var red;

        afterEach(function () {
            // Ensure STOPPED client in any case
            red.destructor();
        });

        it('Domain with no match, no fallback', function (done) {
            red = new Driver(url);

            red.read(['unmatched.com', '*'], function (err, data) {
                expect(data).to.eql([
                    [],
                    [],
                    []
                ]);
                red.destructor();
                done();
            });
        });

        it('Single domain with a backend', function (done) {
            red = new Driver(url);
            red.create('domain.com', 'myvhost', function () {
                red.add('domain.com', 'backend:1234', function () {
                    red.read(['domain.com', '*'], function (err, data) {
                        expect(data).to.eql([
                            ['myvhost', 'backend:1234'],
                            [],
                            []
                        ]);
                        red.destructor();
                        done();
                    });
                });
            });
        });

        it('Single domain with multiple backends', function (done) {
            red = new Driver(url);
            red.add('domain.com', 'backend:4567', function () {
                red.read(['domain.com', '*'], function (err, data) {
                    expect(data).to.eql([
                        ['myvhost', 'backend:1234', 'backend:4567'],
                        [],
                        []
                    ]);
                    red.destructor();
                    done();
                });
            });
        });

        it('Single domain with multiple backends and fallback', function (done) {
            red = new Driver(url);
            red.create('*', 'supervhost', function () {
                red.add('*', 'backend:910', function () {
                    red.read(['domain.com', '*'], function (err, data) {
                        expect(data).to.eql([
                            ['myvhost', 'backend:1234', 'backend:4567'],
                            ['supervhost', 'backend:910'],
                            []
                        ]);
                        red.destructor();
                        done();
                    });
                });
            });
        });

        it('Single domain with multiple backends and fallback plus dead', function (done) {
            red = new Driver(url);
            red.mark('domain.com', 1, 'backend:4567', 2, 1, function () {
                red.read(['domain.com', '*'], function (err, data) {
                    expect(data).to.eql([
                        ['myvhost', 'backend:1234', 'backend:4567'],
                        ['supervhost', 'backend:910'],
                        [1]
                    ]);
                    red.destructor();
                    done();
                });
            });
        });

        it('Single domain with multiple backends and fallback plus a second dead', function (done) {
            red = new Driver(url);
            red.mark('domain.com', 5, 'backend:4567', 2, 1, function () {
                red.read(['domain.com', '*'], function (err, data) {
                    expect(data).to.eql([
                        ['myvhost', 'backend:1234', 'backend:4567'],
                        ['supervhost', 'backend:910'],
                        [1, 5]
                    ]);
                    red.destructor();
                    done();
                });
            });
        });

        it('... let it expire', function (done) {
            red = new Driver(url);
            // Now, let it expire
            setTimeout(function () {
                red.read(['domain.com', '*'], function (err, data) {
                    expect(data).to.eql([
                        ['myvhost', 'backend:1234', 'backend:4567'],
                        ['supervhost', 'backend:910'],
                        []
                    ]);
                    red.destructor();
                    done();
                });
            }, 1000);
        });

    };

})();
