# This file describes how to build hipache into a runnable linux container with all dependencies installed
# To build:
# 1) Install docker (http://docker.io)
# 2) Build: wget https://raw.github.com/dotcloud/docker/v0.1.6/contrib/docker-build/docker-build && python docker-build $USER/hipache < Dockerfile
# 3) Run:
# docker run -p :80 -p :6379 -d $USER/hipache supervisord -n
# redis-cli
#
# VERSION		0.1
# DOCKER-VERSION	0.1.6

from	ubuntu:12.04
run	echo "deb http://archive.ubuntu.com/ubuntu precise main universe" > /etc/apt/sources.list
run	apt-get -y update
run	apt-get -y install wget git redis-server supervisor
run	wget -O - http://nodejs.org/dist/v0.8.23/node-v0.8.23-linux-x64.tar.gz | tar -C /usr/local/ --strip-components=1 -zxv
run	npm install hipache -g
run	mkdir -p /var/log/supervisor
copy	supervisord.conf	/etc/supervisor/conf.d/supervisord.conf
