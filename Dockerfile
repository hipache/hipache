# This file describes how to build hipache into a runnable linux container with all dependencies installed
# To build:
# 1) Install docker (http://docker.io)
# 2) Clone hipache repo if you haven't already: git clone https://github.com/dotcloud/hipache.git
# 3) Build: cd hipache && docker build .
# 4) Run: docker run -d <imageid>
# See the documentation for more details about how to operate Hipache.

# Latest Ubuntu LTS
from    ubuntu:14.04

# Update
run apt-get -y update

# Install supervisor, node, npm and redis
run apt-get -y install supervisor nodejs npm redis-server

# Manually add hipache folder
run mkdir ./hipache
add . ./hipache

# Then install it
run npm install -g ./hipache --production

# This is provisional, as we don't honor it yet in hipache
env NODE_ENV production

# Add supervisor conf
add ./supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose hipache and redis
expose  80
expose  6379

# Start supervisor
cmd ["supervisord", "-n"]
