# Application plugins

All Fastify plugins live in this tree and are composed by `app.js`.
Cross-area imports use `#plugins/*`; nearby files in the same feature use relative imports.

- `shared/` owns configuration, PostgreSQL, Redis, cache, metrics, health, Sentry, and queue producers for every role.
- `api/` owns authentication, static serving, flags, email, and other API-only functionality for `api` and `all`.
- `worker/` registers consumers and cleanup schedules for `worker` and `all`.

The application registers environment configuration first, then shared infrastructure and applicable API plugins.
Health routes follow API plugins so route hooks such as circuit-breaker initialize them correctly.
Queue producers are registered after infrastructure so shutdown drains jobs before closing their dependencies.
Worker registration follows queue setup, and consumers activate at `onReady` only after dependencies and decorators exist.
API-only instances never load the worker plugin tree.

Do not autoload the entire `plugins/` directory at once or duplicate shared plugins under a role.
Keep named Fastify plugin dependencies explicit and preserve their startup and shutdown ordering.
Job processors remain under `worker/workers/`; routes and route-scoped hooks remain under `api/routes/`.
Fastify CLI owns startup and graceful close, using `config/fastify-cli.cjs` to read `loadRuntimeConfig` for `address`, `port`, and `closeGraceDelay`, with `options: true`.
The single `app.js` exports lazy CLI server options from `config/server-options.js`.
Telemetry initializes through the Node preload `--import ./otel.js` before Fastify loads, not through an autoloaded plugin.
The watch parent skips telemetry, while its application child inherits the preload.
Keep telemetry cleanup coordinated with application shutdown; do not restore a custom `main.js` lifecycle or inspector.
CLI `print-routes` and `print-plugins` use `APP_ROLE=api` without the preload, initialize configured dependencies, and close the app and its pools without starting listeners or exporters.
