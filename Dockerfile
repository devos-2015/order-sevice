FROM mhart/alpine-node:4.2.1
MAINTAINER https://github.com/devos-2015/order-service

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

ENV PORT=3000
ENV SHUTDOWN_TIMEOUT=10000
ENV SERVICE_CHECK_HTTP=/healthcheck
ENV SERVICE_CHECK_INTERVAL=10s
ENV SERVICE_CHECK_TIMEOUT=2s


EXPOSE 3000

CMD ["node", "index.js"]
