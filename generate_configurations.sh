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

sed -i "s/bind 127.0.0.1/bind: ${REDIS_BIND_PORT}/" /etc/redis/redis.conf
