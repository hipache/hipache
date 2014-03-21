Hipache tests
=============

<!> This is deprecated - tests now use mocha, though it's a bit rough in there, and some python tests have not been migrated yet. And it doesn't hurt to have these as well.<!>

The tests use the Python `unittest` framework. Why the ... use Python test inside a Node.js project? Because the Q&A team working on Hipache is more familiar with Python, and it was more productive to let them use Python.


Setting up the test environment
-------------------------------

To run the tests, you need to be able to run Hipache on your machine. You also need Python 2.7 and a couple of Python dependencies.

First, install Hipache:

    # at the root of the repository
    npm install

Then, create a Python workspace to run the tests (we *highly* recommend you to install `virtualenv` and `virtualenvwrapper` for that purpose):

    # Note: you need at least Python 2.7
    # (Python 2.6 doesn't have tests discovery)
    mkvirtualenv hipache --python=python2.7

Install the required Python dependencies:

    pip install -r test/requirements.txt


Running the tests
-----------------

Start Hipache:

    # at the root of the repository
    bin/hipache -c config/config_test.json

Run the tests themselves:

    # enter the Python workspace
    workon hipache
    # go to the test directory and invoke the tests
    cd test/functional && python -m unittest discover

Remember to stop Hipache once you're done.
