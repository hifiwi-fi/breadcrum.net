# syntax = docker/dockerfile:1

## Make sure this matches build.args in fly.toml
## These vars get baked into the image/web bundle at build time.
## Do not pass secrets here.
ARG ENV=production
ARG NODE_ENV=production
ARG HOST
ARG TRANSPORT
ARG NODE_VERSION=23

FROM node:${NODE_VERSION}-alpine AS base

LABEL maintainer="HifiWifi LLC"
LABEL fly_launch_runtime="Fastify"

# Set the working directory
WORKDIR /usr/src/app

# Throw-away install stage to reduce size of final image
FROM base AS build

ARG ENV=production
ARG NODE_ENV=production
ARG HOST
ARG TRANSPORT
ARG NODE_VERSION

# RUN echo "@testing https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
# RUN apk add --no-cache pypy@testing ffmpeg brotli mutagen attr yt-dlp

# Copy just the manifest files (for caching)
# Install node modules
COPY --link package*.json ./
COPY --link packages/web/package.json packages/web/package.json
COPY --link packages/worker/package.json packages/worker/package.json
COPY --link packages/resources/package.json packages/resources/package.json
COPY --link patches/* patches/

RUN npm i --include=dev

# Copy the whole project over
COPY --link . .
RUN npm run build

# Install node modules for just the worker
WORKDIR /usr/src/app/packages/web
RUN npm i --omit=dev --install-links --workspaces=false

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /usr/src/app/packages/web /usr/src/app

# Create a user group 'nodegroup', create a user 'nodeuser' under 'nodegroup' and chown all the files to the app user.
RUN addgroup -S nodegroup && \
    adduser -S -D -h /usr/src/app nodeuser nodegroup && \
    chown -R nodeuser:nodegroup /usr/src

# Switch to 'nodeuser'
USER nodeuser

# Open the mapped port
EXPOSE 8080

CMD [ "./node_modules/.bin/fastify", "start", "app.js" ]
