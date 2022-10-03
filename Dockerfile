
FROM node:18-alpine

ARG ENV
ARG NODE_ENV
ARG DOMAIN
ARG TRANSPORT
ARG REGISTRATION=0

LABEL maintainer="HifiWifi LLC"

# Set the working directory
WORKDIR /usr/src/app

RUN apk add --no-cache python3

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# Running npm install
RUN npm install --omit=dev

RUN node scripts/bootstrap-yt-dlp.js

# Create a user group 'nodegroup', create a user 'nodeuser' under 'nodegroup' and chown all the files to the app user.
RUN addgroup -S nodegroup && \
    adduser -S -D -h /usr/src/app nodeuser nodegroup && \
    chown -R nodeuser:nodegroup /usr/src

# Switch to 'nodeuser'
USER nodeuser

# Open the mapped port
EXPOSE 8080

CMD [ "./node_modules/.bin/fastify", "start", "app.js" ]