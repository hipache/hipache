
import base


class DomainMatchingTestCase(base.TestCase):

    def test_wildcard(self):
        port = 2080
        self.spawn_httpd(port)
        self.register_frontend('*.foo.bar', ['http://localhost:{0}'.format(port)])
        self.assertEqual(self.http_request('test.foo.bar'), 200)
        self.assertEqual(self.http_request('pipo.foo.bar'), 200)
        self.assertEqual(self.http_request('foo.bar'), 400)

    def test_short_domain(self):
        port = 2080
        self.spawn_httpd(port);
        self.register_frontend('*.foo', ['http://localhost:{0}'.format(port)])
        self.assertEqual(self.http_request('bar.foo'), 200)
        self.assertEqual(self.http_request('foo.bar'), 400)
        self.assertEqual(self.http_request('foo'), 400)

    def test_naked_domain(self):
        port = 2080
        self.spawn_httpd(port)
        self.register_frontend('foo.bar', ['http://localhost:{0}'.format(port)])
        self.assertEqual(self.http_request('foo.bar'), 200)

    def test_wildcard_priority(self):
        port = 2080
        self.spawn_httpd(port)
        self.spawn_httpd(port + 1, code=201)
        self.spawn_httpd(port + 2, code=202)
        self.spawn_httpd(port + 3, code=203)
        self.register_frontend('*.foo.bar', ['http://localhost:{0}'.format(port)])
        self.register_frontend('foo.bar', ['http://localhost:{0}'.format(port + 1)])
        self.register_frontend('pipo.foo.bar', ['http://localhost:{0}'.format(port + 2)])
        self.register_frontend('*.baz.foo.bar', ['http://localhost:{0}'.format(port + 3)])
        self.assertEqual(self.http_request('test.foo.bar'), 200)
        self.assertEqual(self.http_request('foo.bar'), 201)
        self.assertEqual(self.http_request('pipo.foo.bar'), 202)
        self.assertEqual(self.http_request('qux.baz.foo.bar'), 203)
        self.assertEqual(self.http_request('qux.bix.foo.bar'), 200)
        self.assertEqual(self.http_request('qux.bix.bar.foo'), 400)

    def test_wildcard_depth(self):
        port = 2080
        self.spawn_httpd(port)
        self.spawn_httpd(port + 1, code=201)
        self.spawn_httpd(port + 2, code=202)
        self.spawn_httpd(port + 3, code=203)
        self.spawn_httpd(port + 4, code=204)
        self.spawn_httpd(port + 5, code=205)
        self.spawn_httpd(port + 6, code=206)
        self.register_frontend('*.quux', ['http://localhost:{0}'.format(port)])
        self.register_frontend('*.qux.quux', ['http://localhost:{0}'.format(port + 1)])
        self.register_frontend('*.baz.qux.quux', ['http://localhost:{0}'.format(port + 2)])
        self.register_frontend('*.bar.baz.qux.quux', ['http://localhost:{0}'.format(port + 3)])
        self.register_frontend('foo.bar.baz.qux.quux', ['http://localhost:{0}'.format(port + 4)])
        self.register_frontend('*.foo.bar.baz.qux.quux', ['http://localhost:{0}'.format(port + 5)])

        # This frontend should never match
        self.register_frontend('*.quuux.foo.bar.baz.qux.quux', ['http://localhost:{0}'.format(port + 6)])

        self.assertEqual(self.http_request('too.deep.quuux.foo.bar.baz.qux.quux'), 205)
        self.assertEqual(self.http_request('too.deep.foo.bar.baz.qux.quux'), 205)
        self.assertEqual(self.http_request('foo.bar.baz.qux.quux'), 204)
        self.assertEqual(self.http_request('bar.bar.baz.qux.quux'), 203)
        self.assertEqual(self.http_request('foo.baz.qux.quux'), 202)
        self.assertEqual(self.http_request('foo.qux.quux'), 201)
        self.assertEqual(self.http_request('foo.quux'), 200)
