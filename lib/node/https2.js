(function () {
    'use strict';

    var crypto = require('crypto'),
        net = require('net'),
        tls = require('tls'),
        util = require('util'),
        http = require('http');

    var Connection = null;
    try {
        Connection = process.binding('crypto').Connection;
    } catch (e) {
        throw new Error('node.js not compiled with openssl crypto support.');
    }

    var DEFAULT_PROTOCOLS = ['http/1.1', 'http/1.0'];
    var DEFAULT_HANDSHAKE_TIMEOUT = 120;
    // Disable RC4?
    var DEFAULT_CIPHERS = 'ECDHE-RSA-AES128-SHA256:AES128-GCM-SHA256:' + // TLS 1.2
                          'RC4:HIGH:!MD5:!aNULL:!EDH';                   // TLS 1.0


    // Convert protocols array into valid OpenSSL protocols list (prepend length)
    var convert = function (protos) {
        var buff = new Buffer(protos.reduce(function (p, c) {
            return p + 1 + Buffer.byteLength(c);
        }, 0));

        protos.reduce(function(offset, c) {
            var clen = Buffer.byteLength(c);
            buff[offset] = clen;
            buff.write(c, offset + 1);
            return offset + 1 + clen;
        }, 0);

        return buff;
    };

    // Get sni out of the helo packet
    var sniReg = /^(?:[a-z0-9-]+\.)*[a-z]+$/i;

    var getSni = function (buf) {
      var sni = null;

      for(var b = 0, prev, start, end, str; b < buf.length; b++) {
        if(prev === 0 && buf[b] === 0) {
          start = b + 2;
          end = start + buf[b + 1];
          if(start < end && end < buf.length) {
            str = buf.toString('utf8', start, end);
            if(sniReg.test(str)) {
              sni = str;
              continue;
            }
          }
        }
        prev = buf[b];
      }
      return sni;
    };

    var pipe = function(pair, socket) {
        pair.encrypted.pipe(socket);
        socket.pipe(pair.encrypted);

        pair.encrypted.on('close', function() {
            process.nextTick(function() {
                // Encrypted should be unpiped from socket to prevent possible
                // write after destroy.
                pair.encrypted.unpipe(socket);
                socket.destroySoon();
            });
        });

        pair.fd = socket.fd;
        pair.cleartext.socket = socket;
        pair.cleartext.encrypted = pair.encrypted;
        pair.cleartext.authorized = false;

        // cycle the data whenever the socket drains, so that
        // we can pull some more into it.  normally this would
        // be handled by the fact that pipe() triggers read() calls
        // on writable.drain, but CryptoStreams are a bit more
        // complicated.  Since the encrypted side actually gets
        // its data from the cleartext side, we have to give it a
        // light kick to get in motion again.
        socket.on('drain', function() {
            if (pair.encrypted._pending) {
                pair.encrypted._writePending();
            }
            if (pair.cleartext._pending) {
                pair.cleartext._writePending();
            }
            pair.encrypted.read(0);
            pair.cleartext.read(0);
        });

        function onerror(e) {
            if (pair.cleartext._controlReleased) {
                pair.cleartext.emit('error', e);
            }
        }

        function onclose() {
            socket.removeListener('error', onerror);
            socket.removeListener('timeout', ontimeout);
        }

        function ontimeout() {
            pair.cleartext.emit('timeout');
        }

        socket.on('error', onerror);
        socket.on('close', onclose);
        socket.on('timeout', ontimeout);

        return pair.cleartext;
    };

    var Server = function (options, requestListener) {
        if (!options.pfx && (!options.cert || !options.key)) {
            throw new Error('Missing PFX or certificate + private key.');
        }

        // Next protocol negociation
        var NPNProtocols = options.NPNProtocols || DEFAULT_PROTOCOLS;

        // options.pfx
        // options.key
        // options.passphrase
        // options.cert
        // options.ca
        // options.secureProtocol
        // options.ciphers
        // options.secureOptions

        var sharedCreds = crypto.createCredentials({
            pfx: options.pfx,
            key: options.key,
            passphrase: options.passphrase,
            cert: options.cert,
            ca: options.ca,
            ciphers: options.ciphers || DEFAULT_CIPHERS,
            secureProtocol: options.secureProtocol,
            secureOptions: require('constants').SSL_OP_CIPHER_SERVER_PREFERENCE,
            crl: undefined,
            sessionIdContext: undefined
        });

        options.handshakeTimeout = options.handshakeTimeout || (DEFAULT_HANDSHAKE_TIMEOUT * 1000);

        // So, keep the asynchronously retrieved certificates in here
        var sniCerts = {};

        // If we were provided a resolved function, declare we are ready, otherwise let it null;
        var SNICallback;
        if (options.SNICallback) {
            SNICallback = function (serverName) {
                return sniCerts[serverName];
            };
        }

        this._contexts = [];
        var self = this;

        net.Server.call(this, function (socket) {
            /*jshint camelcase:false*/

            // Have SNI? Then sip it up
            if (options.SNICallback) {
                // Siphon up the data before it's spoofed into the other stream
                socket.once('readable', function () {
                    // Now, read it
                    var buf = socket.read();
                    // Get the SNI
                    var serverNameIndication = getSni(buf);
                    // If no server name indication from the client
                    // or the cert is in here already
                    // get out of here
                    if (!serverNameIndication || (serverNameIndication in sniCerts)) {
                        return socket.push(buf);
                    }
                    // Otherwise, well, we need to heat it and wait for that, then push back
                    options.SNICallback(serverNameIndication, function (creds) {
                        // Store negative results even...
                        sniCerts[serverNameIndication] = creds || null;
                        socket.push(buf);
                    });
                });
            }

            var creds = crypto.createCredentials(null, sharedCreds.context);

            // The exposed method doesn't allow options to be passed :/
            var pair = tls.createSecurePair(creds, true, false, false);
            // So, spoof them
            pair.server = self;
            if (process.features.tls_sni) {
                if (SNICallback) {
                    pair.ssl.setSNICallback(SNICallback);
                }
                pair.servername = null;
            }

            if (process.features.tls_npn && NPNProtocols) {
                pair.ssl.setNPNProtocols(convert(NPNProtocols));
                pair.npnProtocol = null;
            }

            pipe(pair, socket);

            pair.cleartext._controlReleased = false;

            var timeOutListener = function () {
                pair.emit('error', new Error('TLS handshake timeout'));
            };

            socket.setTimeout(options.handshakeTimeout, timeOutListener);

            pair.once('secure', function() {
                socket.setTimeout(0, timeOutListener);

                pair.cleartext.authorized = false;
                pair.cleartext.npnProtocol = pair.npnProtocol;
                pair.cleartext.servername = pair.servername;

                pair.cleartext._controlReleased = true;
                self.emit('secureConnection', pair.cleartext, pair.encrypted);
            });

            pair.on('error', function(err) {
                self.emit('clientError', err, this);
            });
        });


        this.on('secureConnection', http._connectionListener);

        // XXX this is unlikely to work
        this.httpAllowHalfOpen = false;

        if (requestListener) {
            this.addListener('request', requestListener);
        }

        this.addListener('clientError', function(err, conn) {
            conn.destroy(err);
        });
    };

    util.inherits(Server, net.Server);

    Server.createServer = function(opts, requestListener) {
      return new Server(opts, requestListener);
    };

    module.exports = Server;

})();
