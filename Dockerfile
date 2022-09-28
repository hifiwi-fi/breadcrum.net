
FROM node:18-alpine

LABEL maintainer="HifiWifi LLC"

# Set the working directory
WORKDIR /usr/src/app

RUN apk add --no-cache python3

# Copy source code
COPY package*.json ./

# Copy the rest of your app's source code from your host to your image filesystem.
COPY . .

# Running npm install
# RUN npm install --omit=dev
RUN npm install

# Create a user group 'nodegroup', create a user 'nodeuser' under 'nodegroup' and chown all the files to the app user.
RUN addgroup -S nodegroup && \
    adduser -S -D -h /usr/src/app nodeuser nodegroup && \
    chown -R nodeuser:nodegroup /usr/src

# Switch to 'nodeuser'
USER nodeuser

# Open the mapped port
EXPOSE 3000

CMD [ "./node_modules/.bin/fastify", "start", "app.js" ]
