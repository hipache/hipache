#!/bin/bash

echo """
[supervisord]
nodaemon=true

[program:hipache]
command=/usr/local/bin/hipache -c /usr/local/lib/node_modules/hipache/config/config_${SETTINGS_FLAVOR}.json
stdout_logfile=/var/log/supervisor/%(program_name)s.log
stderr_logfile=/var/log/supervisor/%(program_name)s.log
autorestart=true
environment=SETTINGS_FLAVOR=${SETTINGS_FLAVOR}

[program:redis]
command=/usr/bin/redis-server
stdout_logfile=/var/log/supervisor/%(program_name)s.log
stderr_logfile=/var/log/supervisor/%(program_name)s.log
autorestart=true

""" > /etc/supervisor/conf.d/supervisord.conf

echo """
{
    "server": {
        "accessLog": "/var/log/nginx/access.log"
        , "port": 80
        , "workers": 10
        , "maxSockets": 100
        , "deadBackendTTL": 30
        , "tcpTimeout": 30
        , "retryOnError": 3
        , "deadBackendOn500": true
        , "httpKeepAlive": false
""" > /usr/local/lib/node_modules/hipache/config/config_prod.json

if ["$USE_SSL" == "true"]; then
echo """
        , "https": {
            "port": 443,
            "key": "/etc/ssl/ssl.key",
            "cert": "/etc/ssl/ssl.crt"
        }
""" >> /usr/local/lib/node_modules/hipache/config/config_prod.json
fi

echo """
    },
    "redisHost": "127.0.0.1"
    , "redisPort": 6379
}
""" >> /usr/local/lib/node_modules/hipache/config/config_prod.json

sed -i "s/bind 127.0.0.1/bind: ${REDIS_BIND}/" /etc/redis/redis.conf
