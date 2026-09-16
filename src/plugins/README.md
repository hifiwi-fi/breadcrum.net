# Application plugins

All Fastify plugins live in this tree and are composed by `src/app.js`.
Cross-area imports use `#plugins/*`; nearby files in the same feature use relative imports.

- `shared/` owns configuration, PostgreSQL, Redis, cache, metrics, health, Sentry, and queue producers for every role.
- `api/` owns authentication, static serving, flags, email, and other API-only functionality for `api` and `all`.
- `worker/` registers consumers and cleanup schedules for `worker` and `all`.

The application registers environment configuration first, then shared infrastructure and applicable API plugins.
Health routes follow API plugins so route hooks such as circuit-breaker initialize them correctly.
Queue producers are registered after infrastructure so shutdown drains jobs before closing their dependencies.
Worker registration follows queue setup, and consumers activate at `onReady` only after dependencies and decorators exist.
API-only instances never load the worker plugin tree.

Do not autoload the entire `src/plugins/` directory at once or duplicate shared plugins under a role.
Keep named Fastify plugin dependencies explicit and preserve their startup and shutdown ordering.
Job processors remain under `src/worker/workers/`; routes and route-scoped hooks remain under `src/api/routes/`.
Telemetry SDK initialization and shutdown belong to `src/main.js`, not an autoloaded plugin.
