# syntax = docker/dockerfile:1

## Make sure this matches build.args in fly.toml
## These vars get baked into the image/web bundle at build time.
## Do not pass secrets here.
ARG ENV=production
ARG NODE_ENV=production
ARG HOST
ARG TRANSPORT
ARG NODE_VERSION

FROM node:${NODE_VERSION}-alpine AS base

LABEL maintainer="HifiWifi LLC"
LABEL fly_launch_runtime="Fastify"

# Set the working directory
WORKDIR /usr/src/app

CMD if [[ ! -z "$SWAP" ]]; then fallocate -l $(($(stat -f -c "(%a*%s/10)*7" .))) _swapfile && mkswap _swapfile && swapon _swapfile && ls -hla; fi; free -m; /app/run

# Throw-away install stage to reduce size of final image
FROM base AS install

ARG ENV=production
ARG NODE_ENV=production
ARG HOST
ARG TRANSPORT
ARG NODE_VERSION

# RUN echo "@testing https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
# RUN apk add --no-cache pypy@testing ffmpeg brotli mutagen attr yt-dlp

# Copy everything over
COPY --link . .

# Install node modules for just the worker
WORKDIR /usr/src/app/packages/web
RUN npm i --include=dev --install-links --workspaces=false

# Throw-away builld stage to reduce size of final image
FROM install AS build

ARG ENV=production
ARG NODE_ENV=production
ARG HOST
ARG TRANSPORT
ARG NODE_VERSION

WORKDIR /usr/src/app

COPY --from=install /usr/src/app/packages/web /usr/src/app

# Build application
RUN npm run build

# Remove development dependencies
RUN npm i --omit=dev --install-links --workspaces=false

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /usr/src/app /usr/src/app

# Create a user group 'nodegroup', create a user 'nodeuser' under 'nodegroup' and chown all the files to the app user.
RUN addgroup -S nodegroup && \
    adduser -S -D -h /usr/src/app nodeuser nodegroup && \
    chown -R nodeuser:nodegroup /usr/src

# Switch to 'nodeuser'
USER nodeuser

# Open the mapped port
EXPOSE 8080

CMD [ "./node_modules/.bin/fastify", "start", "app.js" ]
