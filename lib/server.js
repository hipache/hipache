'use strict';

var fs    = require('fs'),
    versions      = require("./versions")

function Server(res, message, code) {
  if (!(this instanceof Server)) {
    return new Server(res, message, code);
  }

  // Flag the Response to know
  // that it's an internal error message
  res.errorMessage = true;

  if (message === undefined) {
    message = '';
  }

  code = isNaN(code) ? 400 : parseInt(code, 10);

  var staticPath = function (name) {
    var rootDir = fs.realpathSync(__dirname + '/../');
    return rootDir + '/static/error_' + name + '.html';
  };

  var serveFile = function (filePath) {
    var stream = fs.createReadStream(filePath);
    var headers = {
      'content-type': 'text/html',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'expires': '-1'
    };
    if (res.debug === true) {
      headers['x-debug-error'] = message;
      headers['x-debug-version-hipache'] = versions.hipache;
    }
    res.writeHead(code, headers);
    stream.on('data', function (data) {
      res.write(data);
    });
    stream.on('error', function () {
      res.end();
    });
    stream.on('end', function () {
      res.end();
    });
  };

  var serveText = function () {
    var headers = {
      'content-length': message.length,
      'content-type': 'text/plain',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'expires': '-1'
    };
    if (res.debug === true) {
      headers['x-debug-error'] = message;
      headers['x-debug-version-hipache'] = versions.hipache;
    }
    res.writeHead(code, headers);
    res.write(message);
    res.end();
  };

  if (code === 200) {
    // If code is 200, let's just serve the text message since
    // it's not an error...
    return serveText(message);
  }

  var errorPage = staticPath(code);
  fs.exists(errorPage, function (exists) {
    if (exists === true) {
      return serveFile(errorPage);
    }
    errorPage = staticPath('default');
    fs.exists(errorPage, function (exists) {
      if (exists === true) {
        return serveFile(errorPage);
      }
      return serveText();
    });
  });
};

module.exports = Server;
