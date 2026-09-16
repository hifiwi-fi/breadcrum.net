# Plan: pnpm, one package, and one role-based service

## Status and scope

Planning only; implementation requires approval.
Do not push, deploy, change production secrets, run production migrations, or stop existing Machines as part of this planning task.

Fetched `origin` and ran `git pull --ff-only origin master` in this clean, detached worktree before creating `plan/npm-single-service`.
The branch starts at `4000367aaceb33eb58848690ab446b97c2a08389`, matching `origin/master` at planning time.
The local `master` branch is checked out in another worktree and was left untouched.
The plan now retains pnpm; the branch and document names reflect the original proposal, not a requirement to switch to npm.

## Recommended outcome

- One private ESM package managed by pnpm, one root `package.json`, one freshly generated `pnpm-lock.yaml`, and no workspace member packages or local package dependencies.
- Retain pnpm's native patches, package extensions, and install-policy settings.
- One application composition and lifecycle, with explicit `all`, `api`, and `worker` runtime roles.
- Development runs the API and queue consumers in the same Node.js application process.
- Production runs API-only and worker-only processes on separate Fly Machines using the same image.
- Prefer one existing Fly app, `breadcrum`, with two process groups rather than two separately maintained apps.
- Keep public web pages, API routes, queue contracts, PostgreSQL/Redis integrations, and job behavior unchanged.

Fly supports this arrangement through [process groups](https://fly.io/docs/launch/processes/).
Each group has its own Machines and can scale independently; only the API group needs a public service.
This means two production runtime groups, not two processes sharing a production Machine.
A normal app deployment releases the groups together, so this recommendation trades independent app releases and secret isolation for simpler operations.
If independent releases or strict per-role secret isolation are required, retain `breadcrum` and internal-only `bc-worker` as two apps using the same package, image, and role commands instead.

## Current state and migration constraints

| Area | Current implementation | Required change |
| --- | --- | --- |
| Package management | Root manifest plus `packages/web`, `packages/worker`, and `packages/resources`; pnpm catalogs and workspace links | Merge dependency declarations and remove all three package boundaries |
| Development | Root `watch` launches separate web and worker Fastify CLI watchers | One backend watcher running the combined role |
| Application setup | Separate `packages/web/app.js` and `packages/worker/app.js` with overlapping plugins | One common infrastructure layer and role-specific composition |
| Queues | API creates producer queues; worker creates queues, schedules cleanup, and starts consumers | Separate queue initialization from consumer activation |
| Telemetry | Two `otel.js` preloads with process-global initialization and ports 9091/9092 | One initialization path per process, selected by role |
| Imports and types | Conflicting package-local aliases and Fastify declarations | One unambiguous imports map and consolidated declarations |
| Deployment | Separate Dockerfiles and Fly configs for `breadcrum` and `bc-worker` | One image and preferred one-app process-group configuration |
| Automation | pnpm/workspace commands in workflows, worktree scripts, and deploy tooling | Root pnpm commands without recursive/filter flags and updated paths |

The checked-in worker Fly configuration already has no public `services` block.
It only declares internal health checks and metrics, so the desired worker networking model is already represented in source configuration.
Live Fly state, Machine counts, VM sizes, and secrets have not been inspected.

## 1. Collapse the package layout while retaining pnpm

### Proposed layout

Paths below are relative to the repository root and describe the target, not files created by this plan.

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml          # pnpm settings only; no workspace member packages
patches/                     # Native pnpm dependency patches
Dockerfile
fly.toml
tsconfig.json
src/
  main.js                    # Role selection, bootstrap, and process lifecycle
  app.js                     # Testable Fastify composition
  runtime/                   # Configuration and shared startup/shutdown helpers
  telemetry/                 # Single OTel/Sentry bootstrap and metrics setup
  plugins/                   # Shared database, Redis, cache, and queue infrastructure
  api/                       # Existing API routes, schemas, and API-only plugins
  worker/                    # Consumer registration and existing job processors
  resources/                 # Existing shared domain/query/queue modules
  types/                     # Shared type declarations and utilities
client/                      # Existing domstack source
public/                      # Generated assets
migrations/
data/                        # Ignored local/runtime data, including GeoIP
scripts/
test/                        # Shared test helpers and runtime integration tests
```

Keep colocated tests and existing feature organization within the moved directories.
Do not rewrite processors, routes, schemas, or frontend components merely to accommodate relocation.

### Dependencies and install behavior

1. Merge the four manifests into the root manifest, retaining the root name, release version, Node requirement, and ESM configuration.
2. Resolve `catalog:` values using `pnpm-workspace.yaml` and remove the internal `@breadcrum/resources` dependency.
3. Keep current dependency ranges initially, but require a fresh pnpm resolution of the complete dependency tree rather than preserving the old lockfile's selected versions.
   Version changes within those ranges are expected and must be reviewed and tested; widening ranges or introducing unrelated major upgrades is outside this migration.
4. Audit production versus development dependencies against server imports, client build requirements, and the migration command before pruning the image.
5. Generate a completely new root `pnpm-lock.yaml` from that fresh resolution in a clean install environment with no existing `node_modules` or lockfile.
   Do not reuse the old workspace resolution or seed resolution from the existing installed tree.
   Include the new lockfile in the implementation changes, then prove a clean `pnpm install --frozen-lockfile` reproduces it without workspace links.
6. Remove nested package manifests, workspace package globs, catalog definitions, and workspace-linking/deployment settings after their behavior has been accounted for.
   Retain `pnpm-workspace.yaml` as pnpm's settings file for patches, package extensions, and install policies, with an explicit empty `packages` list and no member packages.
   Verify this configuration with the chosen pnpm version and require the regenerated lockfile to contain only the root importer.
7. Document the supported pnpm version alongside the existing Node 26 requirement and use it consistently in CI and Docker.
   Do not introduce `package-lock.json` or switch package managers.

The existing `patches/giscus@1.6.0.patch` adds `credentialless` to the comments iframe and must remain managed by pnpm's native `patchedDependencies` configuration.
Do not introduce `patch-package` or a separate build-time patch mechanism.
If fresh resolution selects a different Giscus version, review and regenerate its native pnpm patch as necessary, updating the version mapping and patch file together.
Require successful patch application and a regression check on the emitted iframe behavior; do not silently accept an unused or inapplicable patch.

Preserve pnpm's `htm` peer extension, release-age policy/exceptions, and build-script controls when removing workspace membership.
Review lifecycle settings for esbuild, protobufjs, Sentry CLI, and unrs-resolver against the chosen pnpm version without silently broadening trusted install-time execution.
The settings file's name does not imply a multi-package repository: there will be only one package and one lockfile importer.

### Imports, paths, and types

- Replace internal `@breadcrum/resources/...` imports with root `#resources/*` aliases.
- Introduce clear `#api/*`, `#worker/*`, and shared/runtime aliases instead of preserving conflicting `#plugins`, `#routes`, and `#test` meanings.
- Preserve useful client aliases and runtime `.js` specifiers for aliases mapped to type-only `.ts` sources.
- Consolidate Fastify config, metrics, and pg-boss declarations without falsely declaring role-specific functionality universally available.
- Preserve browser-safe imports for flags and other client-shared values; do not pull server infrastructure into client bundles.
- Update static/admin asset roots, package-version reads, migration paths, GeoIP paths, blog scripts, generated source links, and test fixtures.
- Consolidate TypeScript, ESLint, and Knip configuration while retaining browser/server typing boundaries and JSDoc conventions.
- Search active code, scripts, editor configuration, and documentation for stale `packages/*`, catalog, and workspace references, retaining valid single-package pnpm usage.

## 2. Merge application startup and lifecycle

### Role contract

| Role | Public API/pages | Queue producers | Consumers and cleanup schedules | HTTP listener |
| --- | --- | --- | --- | --- |
| `all` | Yes | Yes | Yes | One combined development listener, normally port 3000 |
| `api` | Yes | Yes | No | Public service listener, production port 8080 |
| `worker` | No | Yes, for follow-up jobs | Yes | Health-only listener, production port 8080, not publicly routed |

Use explicit CLI role selection, such as `node src/main.js --role=api`, for deploy commands.
Development scripts explicitly select `all`; production must not silently default to the combined role.
Reject unknown or missing required roles before opening connections.

### Composition

1. Load the root development environment and validate role-specific configuration before telemetry or application imports with side effects.
2. Initialize OTel/Sentry once, then dynamically import application code so instrumentation is installed early enough.
3. Construct one Fastify application and register shared configuration, PostgreSQL, Redis, cache, metrics, health, and queue producers once.
4. Register API-only schemas, routes, static serving, auth, and other API plugins only for `api` or `all`, preserving autoload order and route hooks.
5. Load worker processors and register consumers/schedules only for `worker` or `all`, after their dependencies and queue decorators are ready.
6. Mark the application ready only after required startup steps succeed, with cleanup for partial initialization or listener failure.

Do not mount the two existing apps unchanged under a parent server.
Their overlapping infrastructure, schemas, decorators, and telemetry ownership would preserve duplication and introduce conflicts.
Keep the app factory usable by tests without automatically installing signal handlers or starting telemetry listeners.

### Queues and shutdown

Continue using PostgreSQL-backed pg-boss queues in development, even though producers and consumers now share a process.
Preserve the `pgboss_v11` schema, queue names, payloads, retry policies, delayed jobs, concurrency controls, request correlation, and cleanup schedules at 03:00/04:00 UTC.
Do not widen the pg-boss dependency range or intentionally migrate its schema as part of this work.
Review any pg-boss version change selected by the required fresh resolution for queue compatibility and automatic schema migration behavior before accepting it.
Retain pg-boss's dedicated database pool rather than folding it into the application pool.

Give each acquired resource a cleanup owner immediately.
On SIGINT/SIGTERM, mark unready, stop accepting new requests and jobs, drain active requests/jobs while their database/cache/follow-up queue operations remain available, then close queues and pools and flush telemetry last.
Verify pg-boss v12 stop/drain behavior before choosing exact hook ordering.
Make cleanup idempotent and bounded, including startup failures and development restarts.
Align Fly's shutdown timeout with the tested drain budget instead of blindly keeping the current five seconds.
Preserve retry semantics and account for interrupted jobs without promising exactly-once side effects.

### Configuration and observability

Merge the two env schemas and default-env generators with explicit common and role-specific requirements.
Worker-only startup must not require cookie/JWT secrets, built frontend assets, or other API-only configuration.
Load one root local `.env`, with explicit process environment taking precedence, and keep public `HOST`/`TRANSPORT` separate from listener address/port.
Document how to reconcile conflicting values in the existing local env files without overwriting files or symlink targets automatically.

Preserve production service identities `breadcrum-web` and `breadcrum-worker`, selecting them before telemetry initialization.
The combined development role gets one service identity and one metrics exporter, with role/job context in logs and traces.
Preserve existing production metrics ports initially through role-specific settings and Fly metrics blocks.
Verify Sentry request/job scope isolation when HTTP handlers and consumers share a process.

## 3. Root commands and development workflow

- `pnpm install --frozen-lockfile`: reproducible single-package installation, including native patch application.
- `pnpm run watch`: one restarting `all` backend plus the existing domstack asset watcher as development tooling.
- `pnpm start`: retain the current development-oriented convention by delegating to `watch`.
- `pnpm run start:api` and `pnpm run start:worker`: explicit non-watching runtime modes for local production simulation.
- `pnpm run build`: build domstack assets from root paths using the dependencies patched during installation.
- `pnpm run migrate`: run Postgrator against the relocated migrations without booting API or worker consumers.
- `pnpm test`: sequential root ESLint, TypeScript, Node test, and Knip steps using the existing `npm-run-all2` naming pattern.
- `pnpm run deploy`: a future explicit deployment command for both Fly process groups, never invoked as part of install/build/test.

One application process does not mean PostgreSQL, Redis, the file-watching supervisor, or the asset compiler must run inside that process.
The important constraint is that API handlers and queue consumers execute inside the same backend PID in development, without a second worker child process or worker thread.
Watch backend, worker, and resource changes; exclude generated output and client-only changes from backend restarts.
Preserve useful route/plugin inspection and blog/GeoIP maintenance commands with updated paths.

## 4. One image and two Fly process groups

Use a single root multi-stage Dockerfile with frozen-lockfile pnpm installation, frontend build, production dependencies, migration tooling, and both runtime roles.
Copy the root manifest, lockfile, pnpm settings, and native patch files into the install stage.
Replace workspace-filtered `pnpm deploy --legacy` steps with a single-package production dependency install or prune flow, verifying that patched dependencies remain correct.
Retain required OS dependencies, GeoIP assets, build-time public configuration, Sentry release metadata, and non-root execution.
Use explicit Node commands for Fly process startup so signals reach the application directly.
Keep secret files and development data out of image layers and do not pass secrets as build arguments.
Verify the actual image Node version satisfies the manifest rather than assuming the currently declared build argument controls Alpine's installed version.

Keep the existing API group name `app` for the initial migration, avoiding an unnecessary process-group rename.
The following is a topology sketch, not a complete replacement for the existing config:

```toml
app = "breadcrum"
primary_region = "lax"

[processes]
  app = "node src/main.js --role=api"
  worker = "node src/main.js --role=worker"

[[services]]
  protocol = "tcp"
  internal_port = 8080
  processes = ["app"]

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[checks.worker]
  type = "http"
  port = 8080
  path = "/health"
  interval = "15s"
  timeout = "2s"
  grace_period = "15s"
  processes = ["worker"]
```

Carry forward API service health checks, concurrency limits, and other relevant settings omitted from the sketch.
No public service should select the worker group, and no proxy service or public worker hostname is needed for queue processing.
Its health listener must bind to an interface reachable by Fly's internal checks, not only loopback.
Use process-scoped metrics and VM configuration where appropriate.
Keep worker capacity running continuously; HTTP-triggered autostart cannot wake a service-less queue consumer when jobs arrive.
Define a worker restart policy and readiness monitoring, rather than assuming health checks themselves restart unhealthy Machines.

Run database migrations once per deployment attempt through the root release command, never on every Machine boot.
The migration path must not initialize the combined application.
Do not change production database schema or queue contracts for this consolidation.

Fly env and secrets are app-wide in this design.
Reconcile worker-only credentials into the app during a separately approved rollout and use distinct role-specific variables where identical names currently hold different values, especially Sentry DSNs.
Do not assume secret isolation between process groups.
Adapt `scripts/deploy-with-sentry.sh` to the shared image release while retaining pnpm commands, preserving attribution for both existing Sentry projects rather than mapping the entire deployment only to the API project.
Update dashboards/alerts that identify workers through the old Fly app name.

## 5. Update automation and documentation

- Retain pnpm setup, caching, and frozen-lockfile installation across `.github/workflows/tests.yml`, `deploy.yml`, `release.yml`, and lockfile regeneration automation, aligning the pnpm version across them.
- Replace recursive/filter commands with root commands, using one root `pnpm-lock.yaml` artifact and one env-generation/build/test flow.
- Preserve manual deployment gating and replace the two service deployment toggles with an explicit combined deployment action for the preferred topology.
- Update Dependabot's Docker path to the root Dockerfile and review npm dependency grouping after manifest consolidation.
- Keep `.github/scripts/regenerate-lockfile.sh` and its workflow targeting `pnpm-lock.yaml`, adapting any workspace assumptions and preserving native patch validation and the intended fresh-resolution update policy.
- Update `scripts/setup-worktree.sh`, `scripts/link-env-files.sh`, `.zed` configuration, `.dockerignore`, `.gitignore`, and GeoIP cache paths.
- Update `README.md`, `CONTRIBUTING.md`, and applicable `AGENTS.md` paths/commands to describe one package and the runtime role contract.
- Keep historical changelog entries and completed plans as history rather than blindly replacing old commands everywhere.

## 6. Validation and acceptance criteria

Run editor diagnostics and fix relevant TypeScript/JSDoc errors before running unit tests.
Use the Node.js test runner and preserve deterministic cleanup with test lifecycle hooks.

1. A newly resolved dependency tree and freshly generated root `pnpm-lock.yaml` are required deliverables, not a reuse of the old workspace resolution.
   A clean checkout reproduces that resolution with `pnpm install --frozen-lockfile`, native patches applied, and no workspace links, catalogs, or nested project manifests.
   The lockfile has only the root importer, and `pnpm-workspace.yaml` contains settings but no workspace member packages.
2. Root lint/type/dependency checks cover all former workspaces and client build boundaries.
3. Existing API, worker, and resource suites retain coverage and pass against isolated test PostgreSQL/Redis resources.
4. Role tests prove API-only never registers consumers or cleanup schedules, worker-only never registers public API/static routes, and `all` registers shared infrastructure exactly once.
5. An integration test enqueues through the API and completes work through consumers in the same application PID, still using pg-boss.
6. Separate-role integration tests prove the same durable queue contracts work across production-style API/worker processes.
7. Startup failure, SIGINT/SIGTERM, repeated close, and watcher restart tests demonstrate cleanup without duplicate consumers, leaked listeners, or stranded connections.
8. New lifecycle subprocess tests exit naturally without arbitrary sleeps or `--test-force-exit`; do not mask shutdown bugs with forced exits.
9. Worker readiness reflects completed consumer initialization, and shutdown stops advertising readiness before draining.
10. Browser assets build and serve correctly, including the Giscus `credentialless` behavior and public release/config values.
11. One local Docker image can run both production roles independently and run the migration command without starting either role.
12. Local Fly configuration validation confirms public routing selects only `app`, worker checks/metrics are correctly scoped, and no deployment is required to validate the file.
13. Review dependency version changes from the fresh resolution for compatibility, and check the final diff for unintended range changes, queue/schema changes, exposed secrets, stale paths, and changes outside the consolidation scope.

## 7. Future rollout and rollback, separately authorized

These are planning steps only and must not be executed until deployment is explicitly approved.

1. Inventory live Machine counts/sizes, app secrets by name, service routing, database/Redis connectivity, metrics labels, and existing image references without exposing secret values.
2. Rehearse the role split and shutdown behavior locally or in an explicitly approved staging environment.
3. Prepare compatible app-wide secrets and a reviewed migration/release command, preserving the existing public app, domain, and certificates.
4. Choose worker counts and concurrency deliberately, accounting for temporary overlap with `bc-worker` and rolling-deploy Machines.
5. Deploy the shared image with both `app` and `worker` groups only after approval, then verify HTTP behavior, queue progress, cleanup scheduling, and telemetry.
6. Drain and stop the old `bc-worker` consumers once the new worker group is healthy, or arrange a brief processing pause if overlap is unsafe for existing jobs.
7. Keep the old worker app and prior image/config available for rollback; do not delete them during the first cutover.
8. If rollback is needed, drain/stop the new worker group before restoring the old worker capacity, restore the previous API image/config as necessary, and verify pending/delayed jobs and schedules.

Fly treats the declared process-group list as authoritative and can destroy Machines belonging to omitted groups on deployment.
Review group removal and rollback configuration carefully; keeping the existing `app` group avoids an unnecessary API group replacement.
No database rollback should be needed for the consolidation itself because schema and queue contracts remain unchanged.

## Suggested implementation order

1. Flatten files/manifests, migrate dependencies and imports, preserve pnpm settings/patches, and establish a freshly resolved single-package pnpm install with compatibility checks.
2. Introduce the shared runtime, role-aware config, telemetry, and queue lifecycle with focused tests.
3. Replace the two backend watchers with combined development startup and verify end-to-end processing.
4. Consolidate Docker/Fly configuration and deployment/release tooling without deploying.
5. Update CI, local scripts, docs, and complete the validation matrix.
6. Stop for review before any push or production operation.

## References

- [Fly process groups and independent scaling](https://fly.io/docs/launch/processes/).
- [Fly configuration: processes, services, checks, metrics, VM settings, and release commands](https://fly.io/docs/reference/configuration/).
- Current manifests: `package.json`, `packages/web/package.json`, `packages/worker/package.json`, and `packages/resources/package.json`.
- Current deployment definitions: `packages/web/fly.toml`, `packages/worker/fly.toml`, both package Dockerfiles, and `scripts/deploy-with-sentry.sh`.
- Current queue bootstrap: both `plugins/pgboss.js` implementations and `packages/resources/pgboss/start-pgboss.js`.
