FROM blcksync/alpine-node:latest

RUN apk update && apk upgrade && \
    apk add --no-cache bash git \
    busybox-extras \
    python \
    py-pip \
    libtool \
    autoconf \
    automake \
    build-base \
    make gcc musl-dev linux-headers \
    && rm -rf /var/cache/apk/* \
    && mkdir /contract-updater

# Create app directory
WORKDIR /contract-updater

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json /contract-updater/
COPY . /contract-updater/

RUN cd /contract-updater; npm install --only=production

ENV HOME /contract-updater
ENV NODE_ENV production

VOLUME ["/contract-updater/logs"]

CMD [ "/contract-updater/launch.sh" ]
