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

# Throw-away build stage to reduce size of final image
FROM base AS build

# RUN echo "@testing https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
# RUN apk add --no-cache pypy@testing ffmpeg brotli mutagen attr yt-dlp

# Install node modules
COPY --link package*.json ./
RUN npm i --include=dev

# Copy the rest of your app's source code from your host to your image filesystem.
COPY --link . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev

# RUN node scripts/bootstrap-yt-dlp.js

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
