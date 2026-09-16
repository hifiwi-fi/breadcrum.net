# [Breadcrum.net](https://breadcrum.net) 🥖
[![Actions Status](https://github.com/hifiwi-fi/breadcrum.net/workflows/tests/badge.svg)](https://github.com/hifiwi-fi/breadcrum.net/actions)
[![Coverage Status](https://coveralls.io/repos/github/hifiwi-fi/breadcrum.net/badge.svg?branch=master)](https://coveralls.io/github/hifiwi-fi/breadcrum.net?branch=master)

[Breadcrum.net](https://breadcrum.net): Hyper/multimedia (Text, audio, video) bookmarking 💿!

![](./client/static/screenshots/bookmark-window-dark.png#gh-dark-mode-only)
![](./client/static/screenshots/bookmark-window-light.png#gh-light-mode-only)

## Development

Breadcrum is one private ESM package using Node.js 26+ and pnpm 10.34.5.
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
| `pnpm run print-routes` / `pnpm run print-plugins` | Inspect application composition |

## Runtime and layout

`node src/main.js --role=all` runs the combined development backend.
The explicit `api` and `worker` roles run separately in production from the same image.
PostgreSQL-backed queues remain durable even when producer and consumer share a process.

- `src/api/`: API routes, schemas, and API-only plugins.
- `src/worker/`: queue consumers and job processors.
- `src/resources/`: shared domain and queue code.
- `client/`: browser code and domstack content.
- `migrations/`: database migrations.
- `scripts/`: maintenance and deployment tooling.
- `data/geoip/`: ignored local GeoIP database/cache.

The root `Dockerfile` builds both roles, installs only production dependencies in the final image, and runs as a non-root user.
The root `fly.toml` targets the existing `breadcrum` app with public `app` and internal-only `worker` process groups.
Deployments are manual, release both groups together, and require separate approval for the initial `bc-worker` cutover.
No deployment or production migration is part of install, build, or test.

## License

AGPL-3.0-or-later
