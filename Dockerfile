# This file describes how to build Hipache into a runnable linux container with
# all dependencies installed.
#
# To build:
#
# 1) Install docker (http://docker.io)
# 2) Clone Hipache repo if you haven't already: git clone https://github.com/dotcloud/hipache.git
# 3) Build: cd hipache && docker build .
# 4) Run: docker run -d --name redis redis
# 5) Run: docker run -d --link redis:redis -P <hipache_image_id>
#
# See the documentation for more details about how to operate Hipache.

# Latest node 0.12
FROM node:6.1

# Manually add Hipache folder
RUN mkdir ./hipache
ADD . ./hipache

# Then install it
RUN npm install -g ./hipache --production

# This is provisional, as we don't honor it yet in Hipache
env NODE_ENV production

# Create Hipache log directory
RUN mkdir -p /var/log/hipache

# Expose Hipache
EXPOSE  80 443

# Start supervisor
CMD [ "/usr/local/bin/hipache", "-c", "/usr/local/lib/node_modules/hipache/config/config.json" ]
