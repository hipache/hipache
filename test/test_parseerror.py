
import os
import time
import signal
import logging
import SocketServer
import base


logger = logging.getLogger(__name__)


class TCPHandler(SocketServer.BaseRequestHandler):

    def _generate_response(self):
        """ This generates a wrong HTTP request, Content-Length is higher
            than the response size.
        """
        r = 'HTTP/1.1 200 OK\n'
        r += 'Content-Type: text/plain\n'
        r += 'Content-Length: 4096\n'
        r += '\n'
        r += 'test'
        return r

    def handle(self):
        data = self.request.recv(4096)
        logger.info("Received from {0}: {1}".format(self.client_address[0], data))
        self.request.sendall(self._generate_response())
        self.request.close()


class ParseError(base.TestCase):

    """ This test makes sure an HTTP parse error won't kill the server """

    def _spawn_server(self, port):
        pid = os.fork()
        if pid > 0:
            while True:
                r = self.http_request('localhost', port=port)
                if r > 0:
                    logger.info('FAKE httpd spawned on port {0}. PID: {1}'.format(port, pid))
                    return pid
                time.sleep(0.5)
            return pid
        server = SocketServer.TCPServer(('localhost', port), TCPHandler)
        server.serve_forever()

    def test_parseerror(self):
        port = 2080
        pid = self._spawn_server(port)
        self.register_frontend('foobar', ['http://localhost:{0}'.format(port)])
        # The request will throw a TCP timeout (since all bytes announced in
        # the Content-Length cannot be read)
        self.assertEqual(self.http_request('foobar'), -1)
        os.kill(pid, signal.SIGKILL)
        os.wait()
