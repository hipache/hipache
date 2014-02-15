
import os
import time
import signal
import socket
import logging
import SocketServer
import base


logger = logging.getLogger(__name__)


class BaseTCPHandler(SocketServer.BaseRequestHandler):

    def generate_response(self, size):
        """ This generates a wrong HTTP request, Content-Length is higher
            than the response size.
        """
        r = 'HTTP/1.1 200 OK\n'
        r += 'Content-Type: text/plain\n'
        r += 'Content-Length: {0}\n'.format(size)
        r += '\n'
        r += 'test'
        return r

    def receive(self):
        data = self.request.recv(4096)
        logger.info("Received from {0}: {1}".format(self.client_address[0], data))


class TCPHandlerBodyTooShort(BaseTCPHandler):

    def handle(self):
        self.receive()
        self.request.sendall(self.generate_response(4096))
        self.request.close()


class TCPHandlerBodyTooLong(BaseTCPHandler):

    def handle(self):
        self.receive()
        self.request.sendall(self.generate_response(2))
        self.request.close()


class ParseError(base.TestCase):

    """ This test makes sure an HTTP parse error won't kill the server """

    def _spawn_server(self, port, handler):
        pid = os.fork()
        if pid > 0:
            while True:
                r = self.http_request('localhost', port=port)
                if r > 0:
                    logger.info('FAKE httpd spawned on port {0}. PID: {1}'.format(port, pid))
                    self.pids.append(pid)
                    return pid
                time.sleep(0.5)
        SocketServer.TCPServer.allow_reuse_address = True
        server = SocketServer.TCPServer(('localhost', port), handler)
        server.allow_reuse_address = True
        server.serve_forever()

    def setUp(self):
        self.pids = []

    def tearDown(self):
        if not self.pids:
            return
        for pid in self.pids:
            os.kill(pid, signal.SIGKILL)
        os.wait()

    def test_parseerror_body_too_long(self):
        """ Invalid backend: len(payload) > Content-Length """
        port = 2080
        self._spawn_server(port, TCPHandlerBodyTooLong)
        self.register_frontend('foobar', ['http://localhost:{0}'.format(port)])
        # The request will throw a TCP timeout (since all bytes announced in
        # the Content-Length cannot be read)
        self.assertEqual(self.http_request('foobar'), 200)

    def test_parseerror_body_too_short(self):
        """ Invalid backend: len(payload) < Content-Length """
        port = 2080
        self._spawn_server(port, TCPHandlerBodyTooShort)
        self.register_frontend('foobar', ['http://localhost:{0}'.format(port)])
        # The request will throw a TCP timeout (since all bytes announced in
        # the Content-Length cannot be read)
        self.assertEqual(self.http_request('foobar'), -1)

    def test_parseerror_malformed_client(self):
        """ Invalid request made on a valid backend. """
        port = 2080
        self.spawn_httpd(port)
        self.register_frontend('foobar', ['http://localhost:{0}'.format(port)])
        self.assertEqual(self.http_request('foobar'), 200)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        # Connect on Hipache
        sock.connect(('localhost', 1080))
        data = 'GET /pipo&%$#(PIPO HTTP/1.1\n'
        data += 'Host: foobar\n\n'
        sock.sendall(data)
        response_code = sock.recv(12).split(' ')[1]
        self.assertEqual(response_code, '200')
        sock.sendall(data)
        sock.close()
