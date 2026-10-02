# [Breadcrum.net](https://breadcrum.net) 🥖
[![Actions Status](https://github.com/hifiwi-fi/breadcrum.net/workflows/tests/badge.svg)](https://github.com/hifiwi-fi/breadcrum.net/actions)
[![Coverage Status](https://coveralls.io/repos/github/hifiwi-fi/breadcrum.net/badge.svg?branch=master)](https://coveralls.io/github/hifiwi-fi/breadcrum.net?branch=master)

[Breadcrum.net](https://breadcrum.net): Hyper/multimedia (Text, audio, video) bookmarking 💿!

![](./client/static/screenshots/bookmark-window-dark.png#gh-dark-mode-only)
![](./client/static/screenshots/bookmark-window-light.png#gh-light-mode-only)

## Development

Breadcrum is one private ESM package using Node.js 26+ and pnpm 12.x.
Install from the repository root with `pnpm install --frozen-lockfile`.
Keep `pnpm-workspace.yaml`: it stores native dependency patches, package extensions, and install policies, not workspace packages.

Local development needs PostgreSQL and Redis.
See [CONTRIBUTING.md](./CONTRIBUTING.md) for environment setup, migrations, testing, and deployment prerequisites.
Run `pnpm run watch` (or `pnpm start`) for the asset watcher and one backend process containing both the API and queue consumers.

| Command | Purpose |
| --- | --- |
| `pnpm run generate-default-env` | Create a root development `.env` without replacing an existing file or link |
| `pnpm run build` | Build `client/` into `public/` |
| `pnpm run migrate` | Run the root Postgrator migrations without starting the application |
| `pnpm test` | Run the root checks and test suites |
| `pnpm run start:api` | Start only the API and queue producers |
| `pnpm run start:worker` | Start only the queue consumers and internal health listener |
| `pnpm run print-routes` / `pnpm run print-plugins` | Load and inspect the API application without listeners or telemetry exporters |

## Runtime and layout

`pnpm run watch:server` runs the combined development backend with Fastify CLI:

```sh
APP_ROLE=all node --import ./otel.js node_modules/fastify-cli/cli.js start --config ./config/fastify-cli.cjs --watch --ignore-watch='client public data .tap' app.js
```

Fastify CLI also ignores `.git` and `node_modules` by default.
The Node preload initializes telemetry before Fastify loads; the watch parent skips telemetry and its application child inherits the preload.
Select the role through `APP_ROLE=api|worker|all`; missing or unknown roles fail startup, and `--role` flags are not supported.
The combined `all` role is rejected when either `NODE_ENV=production` or `ENV=production`.
The explicit `api` and `worker` roles run separately in production from the same image.
PostgreSQL-backed queues remain durable even when producer and consumer share a process.

- `app.js`: the single Fastify application composition for all roles, tests, and CLI inspection, exporting lazy CLI server options from `config/server-options.js`.
- `otel.js`: Node telemetry preload for runtime startup.
- `config/fastify-cli.cjs`: shared CLI startup and graceful-close configuration, reading `loadRuntimeConfig` for `address`, `port`, and `closeGraceDelay`, with `options: true`.
- `plugins/shared/`: shared env, PostgreSQL, Redis, cache, metrics, health, queue, sensible, and Sentry plugins.
- `plugins/api/`: API-only plugins, including auth, static serving, and flags.
- `plugins/worker/`: pg-boss consumer registration.
- `api/`: API routes and schemas.
- `worker/`: queue consumers and job processors.
- `resources/`: shared domain and queue code.
- `config/`: shared environment schema composition, loading, role defaults, and application options; plugin-owned fragments stay alongside their plugins.
- `client/`: browser code and domstack content.
- `migrations/`: database migrations.
- `scripts/`: maintenance and deployment tooling.
- `data/geoip/`: ignored local GeoIP database/cache.

Cross-area plugin imports use the root `#plugins/*` alias.
There are no separate API/worker app wrappers, custom `main.js` bootstrap, or custom inspector.
Runtime startup and the graceful-close deadline are owned by Fastify CLI configuration.
Inspection commands run `APP_ROLE=api fastify print-routes app.js` or `APP_ROLE=api fastify print-plugins app.js`, without the telemetry preload.
They load the app and its configured dependencies, then close the app and its pools without listening or exporting telemetry.
Use local development services for inspection; it is not a static source-only operation.

The root `Dockerfile` builds both roles, installs only production dependencies in the final image, and runs as a non-root user.
Its command is `node --import ./otel.js node_modules/fastify-cli/cli.js start --config ./config/fastify-cli.cjs app.js`, with no implicit `APP_ROLE`; callers must supply `APP_ROLE=api` or `APP_ROLE=worker` for the production image.
Root `start:api` and `start:worker` scripts prefix this same command with their respective `APP_ROLE` values.
The root `fly.toml` targets the existing `breadcrum` app with public `app` and internal-only `worker` process groups.
Each Fly process command sets its own `APP_ROLE` using `env`; there is no global role default.
Deployments are manual, release both groups together, and require separate approval for the initial `bc-worker` cutover.
No deployment or production migration is part of install, build, or test.

## License

AGPL-3.0-or-later
