'use strict'

var request = require('request')
  , util = require('util')


module.exports = new API()




/**
 * Recursively replace every occurrence of pattern in strings with variable
 * value.
 *
 * @param {Object} opts HTTP request options
 * @param {RegExp} pattern String search pattern for String#replace()
 * @param {String} value Value to replace with
 */
function applyVariable(opts, pattern, value) {
  var key

  for (key in opts) {
    if (!opts.hasOwnProperty(key)) continue

    if (typeof opts[key] === 'object') {
      applyVariable(opts[key], pattern, value)
    }
    else if (typeof opts[key] === 'string') {
      opts[key] = opts[key].replace(pattern, value)
    }


  }
}




/**
 * Apply variables to HTTP request pattern.
 *
 * @param {Object} opts HTTP request options
 * @param {Object} params Var name => Var value map
 */
function prepareOptions(opts, params) {
  var name
    , pattern

  for (name in params) {
    if (!params.hasOwnProperty(name)) continue

    pattern = new RegExp('\\$' + name, 'g')
    applyVariable(opts, pattern, params[name])
  }
}




/**
 * API request controller
 *
 * @constructor
 */
function API() {
  /**
   * Requests configuration. Empty by default.
   *
   * @type {Object}
   */
  this.config = {}
}




/**
 * Setup configuration
 *
 * @param {*} serverConfig Hipache configuration
 */
API.prototype.configure = function(serverConfig) {
  this.config = serverConfig.api || {}
}




/**
 * Make respawn request
 *
 * @param {Object} variables
 * @param {Function} callback Function called after HTTP request done
 */
API.prototype.respawn = function(variables, callback) {
  if (!this.config.respawn) callback(null)

  var opts = util._extend({}, this.config.respawn)
  prepareOptions(opts, variables)

  request(opts, function(err, res, body) {
    if (err) {
      return callback(err)
    }
    else if (res.statusCode !== 200) {
      return callback(new Error('API call error: ' + JSON.stringify(body)))
    }

    return callback(null)
  })
}