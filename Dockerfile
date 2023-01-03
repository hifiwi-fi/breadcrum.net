
FROM node:19-alpine

## Make sure this matches build.args in fly.toml
## These vars get baked into the image. Do not pass secrets here.
ARG ENV
ARG NODE_ENV
ARG HOST
ARG TRANSPORT

LABEL maintainer="HifiWifi LLC"

# Set the working directory
WORKDIR /usr/src/app

RUN echo "@testing https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN apk add --no-cache pypy@testing ffmpeg brotli mutagen attr yt-dlp dumb-init

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# Running npm install
RUN npm install --omit=dev

# RUN node scripts/bootstrap-yt-dlp.js

# Create a user group 'nodegroup', create a user 'nodeuser' under 'nodegroup' and chown all the files to the app user.
RUN addgroup -S nodegroup && \
    adduser -S -D -h /usr/src/app nodeuser nodegroup && \
    chown -R nodeuser:nodegroup /usr/src

# Switch to 'nodeuser'
USER nodeuser

# Open the mapped port
EXPOSE 8080

CMD [ "dumb-init", "./node_modules/.bin/fastify", "start", "app.js" ]
