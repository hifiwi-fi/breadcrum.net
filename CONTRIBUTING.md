# Contributing

## Guidelines

- Patches, ideas and fixes are welcome.
- Discuss substantial features in an issue before investing time; a proposal may be declined.
- Stay within the existing style, cover new behavior with tests, and aim for complete coverage.
- Questions are welcome, but support is not guaranteed without a support contract.
- Contributors may leave the project at any time.

## Local development

Use Node.js 26+ and pnpm 12.x, matching the root manifest's engine range.
GitHub Actions selects pnpm major 12 through `pnpm/setup`; Docker is pinned to pnpm 12.8.1.
Keep `install: false` on the setup action so Node setup and explicit frozen installation remain separate steps.
Do not add an exact `packageManager` pin that would override the selected pnpm version.
`verifyDepsBeforeRun: error` prevents `pnpm run` and `pnpm exec` from silently installing dependencies; run `pnpm install --frozen-lockfile` when the installed tree is stale.
Fresh dependency resolution uses pnpm 12's default one-day release-age policy with the exceptions in `pnpm-workspace.yaml`.
All commands run from the repository root; there are no package workspaces or recursive/filter commands.
`pnpm-workspace.yaml` remains the settings file for native patches, package extensions, release-age rules, and approved dependency build scripts.
Do not replace it with npm configuration or introduce a `package-lock.json`.

```sh
pnpm install --frozen-lockfile
pnpm run generate-default-env
```

Use a local PostgreSQL database and Redis instance before running migrations or starting the app.
Configure the root `.env` for these local services and any optional integrations.
Both roles share environment schema composition, the loader, role defaults, and application options in `config/` through the `#config/*` alias.
Plugin-owned schema fragments live beside their plugins in data-only `*.env-schema.js` files; `config/env-schema.js` composes them without loading plugin runtime dependencies.
JSDoc type imports do not execute at runtime, and schema files are excluded from plugin autoload.
The generator uses that unified schema to create development cookie/JWT keys and defaults, but refuses to overwrite an existing file or symlink.
It writes only the repository-root `.env`, regardless of the working directory.
It omits `OTEL_SERVICE_NAME` and `METRICS_PORT` so each role can select its own telemetry defaults.
Process environment values take precedence over the local `.env`.
Never use a production database or credentials for development/tests.
Local `pnpm run migrate` reads root `.postgratorrc.json` and PostgreSQL environment variables, not the application's dotenv loader.
Export `PGPASSWORD` if the local database needs a password; for a different database target, use explicit CLI options or `--no-config` with the appropriate `PG*` variables rather than assuming `DATABASE_URL` will be used.

```sh
pnpm run migrate
pnpm run watch
```

`pnpm start` delegates to `watch`.
The backend watcher runs API handlers and queue consumers in one application PID, alongside the separate domstack asset watcher.
`watch:server` runs `APP_ROLE=all node --import ./otel.js node_modules/fastify-cli/cli.js start --config ./config/fastify-cli.cjs --watch --ignore-watch='client public data .tap' app.js`.
Fastify CLI watches backend changes, excluding `client`, `public`, `data`, and `.tap` in addition to its own default `.git` and `node_modules` exclusions.
The watch parent skips telemetry, while its application child inherits the Node preload.
Fastify CLI 8.0.2 uses a separate five-second deadline for file-change restarts, not `SHUTDOWN_TIMEOUT_MS`; long-running development jobs can be interrupted and retried.
Rapid consecutive file events can also overlap restarts; stop and restart the watcher if this causes a listener conflict.
Use non-watching startup when verifying long-job shutdown behavior.
PostgreSQL and Redis remain external services.
`pnpm run build` creates the browser assets in `public/`.
The Zed debug configurations launch `node_modules/fastify-cli/cli.js` with `runtimeArgs: ['--import', './otel.js']` and `args: ['start', '--config', './config/fastify-cli.cjs', 'app.js']`.
They set `APP_ROLE` in `env`, not command-line role arguments; build assets separately when debugging without the watcher.
The combined debug configuration still rejects `ENV=production`, even with `NODE_ENV=development`.

### Reconciling existing local environments

The former API and worker env files are not automatically merged or overwritten.
Review them locally, choose shared database/Redis/queue settings, and create one root `.env` without printing credentials into logs or commits.
Retain the API public `HOST` and `TRANSPORT`; choose the listener with `LISTEN_HOST` and `PORT`, not by changing the public origin.
Keep different server Sentry DSNs distinct when reconciling environments; do not choose one shared value accidentally.
Runtime selects `SENTRY_API_DSN` for `api` and `all`, and `SENTRY_WORKER_DSN` for `worker`, falling back to `SENTRY_DSN` when the selected value is absent or empty.
Retain optional worker integration credentials in the root environment.
If needed, copy the old `packages/web/data/geoip/` cache to root `data/geoip/` without overwriting an existing root cache.
Both locations remain ignored; old local env files and cache contents are left untouched by the source migration.

`scripts/setup-worktree.sh` links the main worktree's root `.env`, copies `data/geoip/` if absent, and performs a frozen-lockfile installation.
`scripts/link-env-files.sh` links that same root `.env` into other worktrees.
Both preserve existing files and symlinks, including dangling links; they never modify an env symlink's target.
If the main worktree still uses the old layout, reconcile its environment manually before linking.
Editing a linked root `.env` later affects every worktree sharing it.

### Runtime roles

| Role | Command | Behavior |
| --- | --- | --- |
| Combined | `pnpm run watch:server` | API, producers, and consumers in one development process (`APP_ROLE=all`) |
| API | `pnpm run start:api` | Public routes and queue producers, no consumers or cleanup schedules |
| Worker | `pnpm run start:worker` | Consumers and internal health routes, no public routes or frontend requirement |

Select roles only through `APP_ROLE=api|worker|all`; `--role` flags are not supported.
Missing or unknown roles fail startup rather than selecting a default.
The combined `all` role is rejected when either `NODE_ENV=production` or `ENV=production`.
`start:api` and `start:worker` prefix the following non-watching runtime command with `APP_ROLE=api` and `APP_ROLE=worker`, respectively:

```sh
node --import ./otel.js node_modules/fastify-cli/cli.js start --config ./config/fastify-cli.cjs app.js
```

When running separate roles locally, use distinct listener ports, such as `PORT=3001 pnpm run start:worker`.
API and worker production metrics use ports 9091 and 9092 respectively.
The combined role owns one exporter, not two telemetry initializations.

### Application composition and inspection

`app.js` is the single Fastify application composition for runtime, tests, and inspection.
It exports lazy CLI server options from `config/server-options.js`.
Fastify CLI owns startup and graceful close through `config/fastify-cli.cjs`, which reads `loadRuntimeConfig` for `address`, `port`, and `closeGraceDelay`, with `options: true`.
The Node preload `--import ./otel.js` initializes telemetry before Fastify loads.
Ready-state signal shutdown drains jobs and closes pools before flushing telemetry.
CLI startup failures before registration finishes exit nonzero but may bypass close hooks and telemetry flushing; they do not have the same cleanup guarantee as ready-state shutdown.
There are no `api/app.js` or `worker/app.js` wrappers, custom `main.js` bootstrap, or custom inspector.
Keep plugins in one root tree and use `#plugins/*` for cross-area imports:

- `plugins/shared/`: env, PostgreSQL, Redis, cache, metrics, health, queues, sensible, and Sentry.
- `plugins/api/`: auth, static serving, flags, and other API-only plugins.
- `plugins/worker/`: pg-boss consumer registration.

API routes/schemas remain in `api/`, processors in `worker/`, and shared domain/queue code in `resources/`.
`pnpm run print-routes` runs `APP_ROLE=api fastify print-routes app.js`; `pnpm run print-plugins` runs `APP_ROLE=api fastify print-plugins app.js`.
These CLI commands omit the telemetry preload, load the app, and close it and its pools without starting HTTP listeners or telemetry exporters.
The scripts select `APP_ROLE=api`, and the app rejects consumer roles during CLI inspection before opening database or Redis connections.
They still need valid API configuration, local services, and applicable built assets because they initialize the app rather than only reading source files.
Do not point inspection at production resources.

## Client builds and DOMStack v12

The client uses `@domstack/static` pinned to `12.0.0-beta.10`.
Keep the exact pin while using a prerelease.
Run `pnpm run build` for production output or `pnpm run watch:domstack` for asset-only watch mode; Fastify continues to serve the application.
Breadcrum retains its custom Preact/HTM root layout and explicit browser target in `client/esbuild.settings.js`.

### Progressive collections and generated archives

`client/globals/global.data.js` is the sole source-page collection hook.
It uses `previousState`, `changes`, and `setState` to update projections by stable source ID and reuse unchanged feed HTML.
State must contain only cloneable data, never live page objects or render functions, and must not mutate the last successful snapshot when a build fails.
Keep collection dependencies explicit through `dataDeps` and use the focused exported consumer types rather than reading collection values from `vars`.
An unrelated docs edit must not render feed articles or rewrite feed outputs.

`client/blog/archives.pages.js` owns the year archive outputs; do not recreate manual year `page.js` placeholders.
Archives are derived from article paths, while the published 2023–2026 archive URLs remain available even when empty.
The blog lists the newest 50 articles and feeds contain the newest 10; generated year pages remain `noindex`.
Generated pages are not included in the source-page collection supplied to global data.

### Layout registry and inheritance

Register layouts in `client/layout-registry.d.ts` using their actual renderer, `parentLayout`, and default-vars export types.
Declare parent layouts with the named `parentLayout` export instead of importing and calling the parent renderer.
DOMStack handles parent rendering, inherited assets, and watch dependencies; do not also import parent CSS or wrap the parent manually.
Each layout declares its own data subscriptions independently of pages and ancestors.
Use `SitePage` from `#client/types/site-page.js` for JavaScript page renderer contracts and `SitePageVars` when validating supplied vars.
`client/types/layout-contracts.js` contains compile-time checks for layout chains, required vars, content, and subscription isolation.

### Service worker and PWA webmanifest

`client/service-worker.js` is the native worker entrypoint, emitted at the stable `/service-worker.js` URL and compatible with the existing classic registration.
`client/manifest.webmanifest.template.js` separately owns the PWA webmanifest.
The worker remains network-only: there is no fetch interception, precache, offline fallback, or lifecycle takeover.

The DOMStack manifest pipeline is not enabled: no DOMStack manifest or asset inventory is generated, and no policy is injected into the worker.
The worker only logs its installation, preserving its prior behavior.
The existing PWA `manifest.webmanifest` is separate from the DOMStack manifest and remains enabled.
Browser install/update lifecycle testing should use production output rather than watch output.

## Validation

Check editor diagnostics before running unit tests.
Use the root checks and Node.js test runner:

```sh
pnpm run build
node scripts/verify-giscus-patch.js --built
pnpm test
node --test --test-reporter=dot scripts/workflow-scripts.test.js
```

`pnpm test` and `pnpm run test:node` use the dot console reporter and write LCOV coverage to `lcov.info`.
Use `node --test --test-reporter=dot path/to/file.test.js` for a specific colocated suite and `--test-name-pattern` to filter test names.
Include the reporter flag in direct commands; plain `node --test` does not inherit package-script options.
Keep machine-readable TAP output inside the client-build fixture because its parent test parses those results.
Use `pnpm run test:eslint --fix` for automatic formatting and `pnpm run print-routes` / `pnpm run print-plugins` for inspection.
Database-backed tests require isolated local resources and must clean up through test lifecycle hooks.

Run client regression coverage without backend services:

```sh
pnpm run test:tsc
node --test --test-reporter=dot client scripts/client-build.test.js
```

`scripts/client-build.test.js` runs isolated full-site `testBuild()` and real watch suites using temporary source copies and sanitized subprocess environments.
These check generated archive output, inherited layouts/assets, feeds, sitemap, the native worker without DOMStack manifest generation, and edit/add/remove invalidation without modifying tracked sources or loading the local `.env`.
These are correctness tests, not build benchmarks.

### Test service prerequisites

Install the `redis-server` executable on the host's `PATH`; a Redis service container alone is not sufficient for the runtime integration suites.
For example, install `redis` with Homebrew on macOS, or `redis-server` with the system package manager on Ubuntu.
The runtime fixture spawns its own Redis process on a temporary localhost port, with persistence disabled, and stops it during cleanup.
CI installs this executable separately from the shared Redis service container and masks the system service to avoid competing for port 6379.

The fixture in `runtime/integration-fixture.js` connects to local PostgreSQL at `127.0.0.1:5432`, using user/password `postgres` / `postgres` and the `postgres` administration database.
That local user must have permission to create and drop databases.
Each fixture creates a uniquely named `breadcrum_runtime_*` database, applies root migrations, and drops it during cleanup.
The fixture deliberately ignores `DATABASE_URL`, `PGHOST`, `REDIS_CACHE_URL`, and dotenv, so changing those settings does not redirect these integration tests.
Use these well-known credentials only for an isolated local/CI test PostgreSQL instance, never for production.

Existing API/worker suites still need the configured, migrated `breadcrum` test database and shared Redis service; the isolated runtime fixture does not replace their setup.
The test, deploy, and release workflows retain PostgreSQL/Redis service containers and the root migration step for those suites.

The Giscus `credentialless` iframe change is a native pnpm patch in `patches/`.
CI verifies it in both the installed module and emitted browser bundle.
Lockfile regeneration removes the installed tree and old lockfile before resolution, then verifies a clean frozen installation and the patch.
Review dependency changes, especially pg-boss queue compatibility, before accepting a regenerated lockfile.
The lockfile was freshly resolved for the single root package; pg-boss is deliberately pinned to the baseline version `12.28.0` (queue schema version 38).
The initially resolved `12.32.0` would automatically migrate that schema to version 41, so it is excluded from this schema-neutral consolidation.
Changing this pin requires a separately reviewed queue-schema upgrade and rollback plan.
Do not bypass an unused/inapplicable patch or broaden lifecycle-script permissions to make an install pass.

## Maintenance

- `pnpm run new-blogpost "Post title"` creates a draft under `client/blog/`.
- `pnpm run publish-draft post-slug` publishes the current year's draft.
- `node scripts/api/update-geoip-db.js` refreshes `data/geoip/` using locally configured MaxMind credentials.
- The GeoIP script accepts `--env-file`, `--edition-id`, `--data-dir`, and `--force`; see `--help`.

Missing GeoIP credentials leave lookups unavailable unless a cached database exists.
CI restores the root GeoIP cache and optionally refreshes it before tests and deployment builds.
Only the GeoIP database/cache is eligible for copying from local data into the image; `.env` files and private keys are excluded.

## Image and Fly deployment

Deployment is an explicitly authorized operation, never part of install/build/test.
The root image uses Node 26, a frozen pnpm installation with native patches, a root frontend build, and a separate production-dependency installation.
It includes migrations and GeoIP assets, preserves the release identifier, and runs as the non-root `node` user.
Its `CMD` is `node --import ./otel.js node_modules/fastify-cli/cli.js start --config ./config/fastify-cli.cjs app.js`, with no implicit `APP_ROLE` default.
Callers must supply `APP_ROLE=api` or `APP_ROLE=worker`; running the image without a role fails, and its production environment rejects `all`.
No workspace `pnpm deploy` step is used.

The checked-in topology is one existing Fly app, `breadcrum`, with two process groups:

- `app`: `env APP_ROLE=api node --import ./otel.js node_modules/fastify-cli/cli.js start --config ./config/fastify-cli.cjs app.js`, the only group selected by public HTTP/HTTPS services.
- `worker`: `env APP_ROLE=worker node --import ./otel.js node_modules/fastify-cli/cli.js start --config ./config/fastify-cli.cjs app.js`, internal health listener only, with an `always` restart policy.

Set `APP_ROLE` in each process command, not in the global Fly `[env]` table or app-wide secrets.

The Fly release command runs `node --run migrate -- --no-config` once per deployment attempt against root `migrations/`, without booting either application role.
`--no-config` skips the local `.postgratorrc.json` connection settings; Postgrator defaults to the `pg` driver and root-relative `migrations/*` pattern.
The release Machine must receive the correct `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` environment variables, with PostgreSQL SSL settings as required.
Postgrator does not consume the application's `DATABASE_URL` or load `.env`, so `DATABASE_URL` alone is not sufficient for the release command.
Review those migration credentials during the separately authorized rollout without exposing their values.
Migration tooling must remain a production dependency.
`/health` checks and metrics are scoped by group; metrics stay on 9091 (`app`) and 9092 (`worker`).
`kill_timeout` is 120 seconds, above the default 45-second CLI `closeGraceDelay` and 30-second job-drain budget.
The shared CLI config derives the graceful-close deadline from `loadRuntimeConfig`, not from a custom main process.
Validate drain and telemetry cleanup under representative workloads before rollout.
Unhealthy checks do not restart a still-running worker, and no public traffic can wake a stopped queue consumer.
Maintain nonzero worker capacity and alert on worker readiness and queue progress.
Machine counts and sizes must be reviewed during the separately approved rollout rather than inferred from this repository.

For local image validation:

```sh
docker build -t breadcrum:local .
```

`flyctl config validate --config fly.toml` validates configuration against the Fly platform and requires authentication; it is not an offline check and does not deploy.
For offline topology review, parse the TOML and verify that public services select only `app`, worker checks select only `worker`, and metrics use their respective ports.
Use only isolated local services and explicitly supplied test environment variables when smoke-testing that image.
Do not invoke the deployment helper as a validation step: it creates Sentry release metadata and performs a real Fly deployment.

### Manual release and deployment

The `flyctl deploy` GitHub Actions workflow remains manually dispatched, with one `deploy` checkbox for both groups (off by default).
The `npm bump` workflow is also manual; specify a `YYYY.M.D` version or leave it blank for the workflow's date default.
It creates the release commit/tag and GitHub release for this private package, not a public npm package publication.
Its single `deploy` checkbox optionally releases the same image to both process groups.
Release/deploy workflows share a concurrency group and do not cancel an in-progress deployment.

After explicit deployment authorization, `pnpm run deploy` invokes `scripts/deploy-with-sentry.sh` from the repository root.
The helper requires authenticated Fly and Sentry CLIs (or CI tokens) and forwards optional arguments to `fly deploy`.
It creates one `breadcrum@<git-sha>` Sentry release associated with both `breadcrum` and `bc-worker` projects, attaches commits, builds/deploys once, and records success only after Fly succeeds.
Override project selection with `SENTRY_API_PROJECT` and `SENTRY_WORKER_PROJECT`, or the shared release/environment with `SENTRY_RELEASE` and `SENTRY_ENVIRONMENT`.
Supply `SENTRY_BROWSER_DSN` explicitly for the public browser bundle; the helper does not read local env files.
Never pass server DSNs, Sentry auth tokens, MaxMind credentials, or database secrets as Docker build arguments.

Fly environment variables and secrets are app-wide, not isolated by process group.
Before an approved cutover, reconcile worker credentials into `breadcrum` and configure distinct `SENTRY_API_DSN` and `SENTRY_WORKER_DSN` values for the existing Sentry projects.
Runtime maps the selected role-specific value to its effective `SENTRY_DSN`, with the legacy `SENTRY_DSN` as fallback when that value is absent or empty.
The combined `all` role uses the API DSN and one SDK with isolated job scopes, not a second worker SDK.
Runtime role selection preserves the `breadcrum-web` and `breadcrum-worker` telemetry identities; remove stale app-wide overrides that would collapse them.
The shared `SENTRY_RELEASE` must be identical in browser, API, and worker reporting.

The initial cutover from the old `bc-worker` Fly app requires a separate rollout review.
Plan worker counts/concurrency and temporary consumer overlap, verify queue progress and schedules, then drain old consumers only after approval.
Keep the old app/image/config available for rollback and update alerts/dashboards that identify the worker by its former Fly app name.
Fly treats the process-group list as authoritative, so removal of a group on a later deployment can remove its Machines.
See [the consolidation plan](./plans/npm-single-service.md) for the full rollout and rollback checklist.
