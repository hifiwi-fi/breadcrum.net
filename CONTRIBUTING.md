# Contributing

## Guidelines

- Patches, ideas and fixes are welcome.
- Discuss substantial features in an issue before investing time; a proposal may be declined.
- Stay within the existing style, cover new behavior with tests, and aim for complete coverage.
- Questions are welcome, but support is not guaranteed without a support contract.
- Contributors may leave the project at any time.

## Local development

Use Node.js 26+ and pnpm 10.34.5, matching the root manifest, CI, and Dockerfile.
All commands run from the repository root; there are no package workspaces or recursive/filter commands.
`pnpm-workspace.yaml` remains the settings file for native patches, package extensions, release-age rules, and approved dependency build scripts.
Do not replace it with npm configuration or introduce a `package-lock.json`.

```sh
pnpm install --frozen-lockfile
pnpm run generate-default-env
```

Use a local PostgreSQL database and Redis instance before running migrations or starting the app.
Configure the root `.env` for these local services and any optional integrations.
The generator uses the unified runtime schema to create development cookie/JWT keys and defaults, but refuses to overwrite an existing file or symlink.
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
The backend watcher runs API handlers and queue consumers in one application PID (`--role=all`), alongside the separate domstack asset watcher.
It uses Node's portable module-watching mode rather than platform-restricted `--watch-path` options.
Restart it after changing `.env` or adding a new module that has not yet been imported.
PostgreSQL and Redis remain external services.
`pnpm run build` creates the browser assets in `public/`.
The Zed debug configurations launch the same role-based entry point; build assets separately when debugging without the watcher.

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
| Combined | `node src/main.js --role=all` | API, producers, and consumers in one development process |
| API | `pnpm run start:api` | Public routes and queue producers, no consumers or cleanup schedules |
| Worker | `pnpm run start:worker` | Consumers and internal health routes, no public routes or frontend requirement |

Roles are explicit; production does not silently default to `all`.
When running separate roles locally, use distinct listener ports, such as `PORT=3001 pnpm run start:worker`.
API and worker production metrics use ports 9091 and 9092 respectively.
The combined role owns one exporter, not two telemetry initializations.

## Validation

Check editor diagnostics before running unit tests.
Use the root checks and Node.js test runner:

```sh
pnpm run build
node scripts/verify-giscus-patch.js --built
pnpm test
node --test scripts/workflow-scripts.test.js
```

Use `node --test path/to/file.test.js` for a specific colocated suite and `--test-name-pattern` to filter test names.
Use `pnpm run test:eslint --fix` for automatic formatting and `pnpm run print-routes` / `pnpm run print-plugins` for inspection.
Database-backed tests require isolated local resources and must clean up through test lifecycle hooks.

### Test service prerequisites

Install the `redis-server` executable on the host's `PATH`; a Redis service container alone is not sufficient for the runtime integration suites.
For example, install `redis` with Homebrew on macOS, or `redis-server` with the system package manager on Ubuntu.
The runtime fixture spawns its own Redis process on a temporary localhost port, with persistence disabled, and stops it during cleanup.
CI installs this executable separately from the shared Redis service container and masks the system service to avoid competing for port 6379.

The fixture in `src/runtime/integration-fixture.js` connects to local PostgreSQL at `127.0.0.1:5432`, using user/password `postgres` / `postgres` and the `postgres` administration database.
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
No workspace `pnpm deploy` step is used.

The checked-in topology is one existing Fly app, `breadcrum`, with two process groups:

- `app`: `node src/main.js --role=api`, the only group selected by public HTTP/HTTPS services.
- `worker`: `node src/main.js --role=worker`, internal health listener only, with an `always` restart policy.

The Fly release command runs `node --run migrate -- --no-config` once per deployment attempt against root `migrations/`, without booting either application role.
`--no-config` skips the local `.postgratorrc.json` connection settings; Postgrator defaults to the `pg` driver and root-relative `migrations/*` pattern.
The release Machine must receive the correct `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` environment variables, with PostgreSQL SSL settings as required.
Postgrator does not consume the application's `DATABASE_URL` or load `.env`, so `DATABASE_URL` alone is not sufficient for the release command.
Review those migration credentials during the separately authorized rollout without exposing their values.
Migration tooling must remain a production dependency.
`/health` checks and metrics are scoped by group; metrics stay on 9091 (`app`) and 9092 (`worker`).
`kill_timeout` is 120 seconds, above the runtime's default 45-second shutdown budget and 30-second job-drain budget.
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
