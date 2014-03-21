Hipache testing
===============

There is both functional and unit testing.

All tests are written using `mocha` and `chai`.

That's quite simple:

```
var expect = require('chai').expect;
var log = require('npmlog');

describe('My Module', function () {
    describe('#a-group-of-tests', function () {
        it('A specific test', function () {
            log.warn('TestingCategory', 'Quite something hey?');
            expect(someThing).to.eql(somethingElse);
        });
    })
});
```

Running the tests can be done directly using the mocha binary, or istanbul for coverage, or if you want a no-brainer just use the gulp tasks:

 * `gulp test:unit`
 * `gulp test:drivers`
 * `gulp test:func`
 * `gulp test:all`
 * `gulp hack:hipache`
 * `gulp hack:drivers`

Dos and donts
------------------------

First, the donts:

 * don't introduce new testing tools without first discussing it - mocha and chai should suffice
 * generally, don't introduce additional dev-dependencies unless you have a good reason to do so, and you have discussed it first
 * if you want to log something during a test, use `npmlog`
 * if you need to start other services, look into fixtures, and don't forget to do whatever it takes in travis.yml

Now, the dos:

 * do write unit tests for any new module
 * do write unit tests for any new code in existing modules
 * do write functional tests for any new functionality
 * do write both unit and functional tests when fixing bugs


Unit
----

The name of the test file should match the name of the tested/required module.

If possible, keep things separated - test each module from its own file, and only that.


Functional
----------

<!> Right now, functional tests use python <!>

Functional testing should rather be organized following usage families. Eg:

 * websocket backend
 * http backend

and then subdivised by scenario ("backend disaster", etc).
