# syntax = docker/dockerfile:1

ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-alpine3.24 AS base

LABEL maintainer="HifiWifi LLC"
LABEL fly_launch_runtime="Fastify"

# Keep the existing runtime tools and use the actual Node major required by the app.
RUN apk add --no-cache python3 py3-pip git protobuf && \
    node -e "if (Number(process.versions.node.split('.')[0]) < 26) process.exit(1)"
WORKDIR /usr/src/app

FROM base AS dependencies
# Keep this pin aligned with packageManager and the GitHub Actions workflows.
RUN npm install --global pnpm@10.34.5
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --link patches/ patches/

FROM dependencies AS production-dependencies
# Native patch policy stays enabled; browser-only Giscus is in the build tree.
RUN pnpm install --frozen-lockfile --prod

FROM dependencies AS build
RUN pnpm install --frozen-lockfile --prod=false
COPY --link . .

# Public build configuration only; never pass credentials as build arguments.
ARG ENV=production
ARG HOST=localhost:3000
ARG NODE_ENV=production
ARG SENTRY_BROWSER_DSN=
ARG SENTRY_RELEASE=development
ARG TRANSPORT=https
RUN pnpm run build && node scripts/verify-giscus-patch.js --built && mkdir -p data/geoip

FROM base AS runtime
ARG SENTRY_RELEASE=development
ENV NODE_ENV=production \
    ENV=production \
    SENTRY_RELEASE=${SENTRY_RELEASE} \
    LISTEN_HOST=0.0.0.0 \
    PORT=8080

COPY --from=production-dependencies --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/package.json ./package.json
COPY --from=build --chown=node:node /usr/src/app/src ./src
COPY --from=build --chown=node:node /usr/src/app/public ./public
COPY --from=build --chown=node:node /usr/src/app/migrations ./migrations
COPY --from=build --chown=node:node /usr/src/app/.postgratorrc.json ./.postgratorrc.json
COPY --from=build --chown=node:node /usr/src/app/scripts ./scripts
COPY --from=build --chown=node:node /usr/src/app/data/geoip ./data/geoip

USER node
EXPOSE 8080 9091 9092
# Supply APP_ROLE=api or APP_ROLE=worker at runtime; there is no implicit role.
CMD ["node", "src/main.js"]
