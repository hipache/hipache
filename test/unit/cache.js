(function () {
  /*globals describe:false, before:false, after:false*/
  'use strict';

  var expect = require('chai').expect;
  // Useful if you want to see servers talk to you
  // require('npmlog').level = 'silly';

  // var expect = require('chai').expect;

  var cache = require('../../lib/cache');

  describe('Cache', function () {
    describe('parseSubdomain', function () {
      [
        ['dsafadsfas.hello.com:1231', 'dsafadsfas-1231.hello.com'],
        ['dsfadsf-123.hello.com:5678', 'dsfadsf-123.hello.com'],
        ['dsfadsf-123.hello.com', 'dsfadsf-123.hello.com']
      ].forEach(function (setup) {
          describe(setup[0], function () {
            it('should make ' + setup[0] + ' into ' + setup[1], function(done) {
              expect(setup[1]).to.eql(cache.parseSubdomain(setup[0]));
              done();
            })
          });
        });
    });
  });
})();
