#!/bin/bash

dockerhostip=$(ip route show 0.0.0.0/0 | grep -Eo 'via \S+' | awk '{ print $2 }')

echo "$dockerhostip dockerhost" >> /etc/hosts

/usr/local/bin/hipache -c /usr/local/lib/node_modules/hipache/config/config.json
