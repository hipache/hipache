
import base


class SimpleTestCase(base.TestCase):

    def test_simple(self):
        """ Simple test: valid backend """
        port = 2080
        self.spawn_httpd(port)
        self.register_frontend('foobar', ['http://localhost:{0}'.format(port)])
        self.assertEqual(self.http_request('foobar'), 200)

    def test_multiple_backends(self):
        """ Simple test with 3 backends """
        port = 2080
        self.spawn_httpd(port)
        self.spawn_httpd(port + 1)
        self.spawn_httpd(port + 2)
        self.register_frontend('foobar', [
            'http://localhost:{0}'.format(port),
            'http://localhost:{0}'.format(port + 1),
            'http://localhost:{0}'.format(port + 2)
            ])
        # Let's make 10 request to make sure we reach everyone
        for i in xrange(10):
            self.assertEqual(self.http_request('foobar'), 200)

    def test_not_found(self):
        """ Test a frontend which is not here """
        self.assertEqual(self.http_request('foobar'), 400)

    def test_one_failing(self):
        """ One of the backends returns a 502 """
        port = 2080
        self.spawn_httpd(port, code=502)
        self.spawn_httpd(port + 1, code=200)
        # Duplicating the backend in the conf
        self.register_frontend('foobar', [
            'http://localhost:{0}'.format(port),
            'http://localhost:{0}'.format(port + 1)
            ])
        # Generate some traffic to force the failing one to be removed
        codes = []
        for i in xrange(10):
            codes.append(self.http_request('foobar'))
        self.assertIn(502, codes)
        # Then all request should reach the healthy one
        for i in xrange(10):
            self.assertEqual(self.http_request('foobar'), 200)

    # XXX this is failing randomly - the same test now lives in mocha
    # def test_one_crashed(self):
    #     """ One of the backends does not bind """
    #     port = 2080
    #     self.spawn_httpd(port, code=200)
    #     # Duplicating the backend in the conf
    #     self.register_frontend('foobar', [
    #         'http://localhost:{0}'.format(port),
    #         'http://localhost:{0}'.format(port + 1)
    #         ])
    #     # Generate some traffic to force the failing one to be removed
    #     for i in xrange(5):
    #         self.http_request('foobar')
    #     # Then all request should reach the healthy one
    #     for i in xrange(5):
    #         self.assertEqual(self.http_request('foobar'), 200)
