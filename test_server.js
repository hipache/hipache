'use strict'

var config = require('./data/config.json')
  , express = require('express')
  , redis = require('redis')
  , app = express()
  , client = redis.createClient(config.redisPort, config.redisHost)

if (config.redisPassword) {
    client.auth(config.redisPassword)
}

app.configure(function() {
    app.set('port', process.env.PORT || 3000)
    app.use(app.router)
})

app.get('/app/:host/:app/pause', function(req, res, next) {
    var multi = client.multi()
    multi.del('frontend:' + req.params.host)
    multi.rpush('frontend:' + req.params.host, req.params.app, 'paused')
    multi.exec(function(err) {
        if (err) next(err)
        else res.send(200, {ok: true})
    })
})

app.get('/app/:host/:app/resume', function(req, res, next) {
    var multi = client.multi()
    multi.del('frontend:' + req.params.host)
    multi.rpush('frontend:' + req.params.host, config.test.backendHost + app.get('port'))
    multi.exec(function(err) {
        if (err) next(err)
        else res.send(200, {ok: true})
    })
})

app.get('/test', function(req, res) {
    res.json(200, {one: 1, two: 2, three: 3})
})

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'))
})