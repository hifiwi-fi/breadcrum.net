# syntax = docker/dockerfile:1

## Make sure this matches build.args in fly.toml
## These vars get baked into the image/web bundle at build time.
## Do not pass secrets here.
ARG ENV=production
ARG NODE_ENV=production
ARG NODE_VERSION=24

FROM alpine:3.22 AS base

LABEL maintainer="HifiWifi"
LABEL fly_launch_runtime="Fastify"

# Install Node.js and pnpm from Alpine packages
RUN apk add --no-cache nodejs pnpm

# Set the working directory
WORKDIR /usr/src/app

# Throw-away build stage to reduce size of final image
FROM base AS build

ARG ENV=production
ARG NODE_ENV=production
ARG NODE_VERSION

# RUN echo "@testing https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
# RUN apk add --no-cache pypy@testing ffmpeg brotli mutagen attr yt-dlp

# Copy workspace configuration and package files
COPY --link pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY --link packages/web/package.json packages/web/package.json
COPY --link packages/worker/package.json packages/worker/package.json
COPY --link packages/resources/package.json packages/resources/package.json
COPY --link patches/ patches/

# Install all dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Copy the whole project over
COPY --link . .

# Deploy worker package to a standalone directory
RUN pnpm --filter=@breadcrum/worker deploy --prod ./deploy/worker

# Final stage for app image
FROM base

# Copy the worker package from the build image to the final image
COPY --from=build /usr/src/app/deploy/worker /usr/src/app

# Create a user group 'nodegroup', create a user 'nodeuser' under 'nodegroup' and chown all the files to the app user.
RUN addgroup -S nodegroup && \
  adduser -S -D -h /usr/src/app nodeuser nodegroup && \
  chown -R nodeuser:nodegroup /usr/src

# Switch to 'nodeuser'
USER nodeuser

# Open the mapped port
EXPOSE 8080

CMD [ "./node_modules/.bin/fastify", "start", "app.js" ]
