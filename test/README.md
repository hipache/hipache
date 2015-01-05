Hipache testing
===============

We do both unit testing (each and every method should be covered), and functional testing (expressing http/ws requests).

All tests are written using `mocha` and `chai`.

That's quite simple:

```javascript
var expect = require('chai').expect;

describe('My Module', function () {
    describe('#a-group-of-tests', function () {
        it('A specific test', function () {
            expect(someThing).to.eql(somethingElse);
        });
    })
});
```

And if you don't like `expect`, use `should`, or `assert`, or whatever else that [chai provides](http://chaijs.com/api/).

Then running the tests can be done directly using the mocha binary, or istanbul for coverage, or if you want a no-brainer just use the provided gulp tasks:

 * `gulp test:unit` (run just unit tests, minus the drivers tests)
 * `gulp test:drivers` (run just the drivers unit tests)
 * `gulp test:func` (run the functional tests)
 * `gulp test:all` (run all tests)
 * `gulp hack:hipache` (watch for modifications and run unit (no driver) and functional tests on every modification)
 * `gulp hack:drivers` (watch for modifications and run driver tests on every modification)

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

If possible, keep things separated - test each module from its own test file, and only that.


Functional
----------

Functional testing should rather be organized following usage families. Eg:

 * websocket backend
 * http backend

and then subdivised by scenario ("backend disaster", etc).

Note that we still run some tests in python, that have not yet been ported to javascript.
