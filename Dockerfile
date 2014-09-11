# This file describes how to build hipache into a runnable linux container with all dependencies installed
# To build:
# 1) Install docker (http://docker.io)
# 2) Clone hipache repo if you haven't already: git clone https://github.com/dotcloud/hipache.git
# 3) Build: cd hipache && docker build .
# 4) Run: docker run -d <imageid>
# See the documentation for more details about how to operate Hipache.

# Latest Ubuntu LTS
FROM    ubuntu:14.04

# Update
RUN apt-get -y update

# Install supervisor, node, npm and redis
RUN apt-get -y install supervisor nodejs npm redis-server python-pip
RUN pip install supervisor-stdout

# Manually add hipache folder
RUN mkdir ./hipache
ADD . ./hipache

# Install npm modules
WORKDIR /hipache
RUN npm install --production

# This is provisional, as we don't honor it yet in hipache
ENV NODE_ENV production

# Add supervisor conf
ADD ./supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose hipache and redis
EXPOSE  80

# Start supervisor
CMD ["supervisord", "-n"]
