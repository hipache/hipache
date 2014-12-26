Hipache tests
=============

<!> This is deprecated - tests now use mocha, though it's a bit rough in there, and some python tests have not been migrated yet. And it doesn't hurt to have these as well.<!>

The tests use the Python `unittest` framework. Why the ... use Python test inside a Node.js project? Because the Q&A team working on Hipache is more familiar with Python, and it was more productive to let them use Python.


Setting up the test environment
-------------------------------

To run the tests, you need to be able to run Hipache on your machine. You also
need Python 2.7 and a couple of Python dependencies.

**Important:** all commands below must be run at the root of the project.

First, install Hipache:

    npm install

Then, create a Python workspace to run the tests (we *highly* recommend you to
install `virtualenv` and `virtualenvwrapper` for that purpose):

    # Note: you need at least Python 2.7
    # (Python 2.6 doesn't have tests discovery)
    mkvirtualenv hipache --python=python2.7

Install the required Python dependencies:

    pip install -r test/functional/requirements.txt


Running the tests
-----------------

A `redis` server must run. For instance, you can run a Docker container:

    docker run -p 6379:6379 redis

**Note:** if you want to use a different port, you can set the `REDIS_PORT`
environment variable before running the test suite. In a similar manner, the
`REDIS_ADDRESS` environment variable allows you to configure the Redis host.
You will also have to configure the `redis` url in the `config/config_test.json`
file.

Now, start Hipache:

    # at the root of the repository
    bin/hipache -c config/config_test.json

Run the tests themselves:

    # enter the Python workspace
    workon hipache
    # go to the test directory and invoke the tests
    cd test/functional && python -m unittest discover

Remember to stop Redis and Hipache once you're done.
