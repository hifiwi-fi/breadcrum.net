# Breadcrum worker 🥖

This directory contains the queue consumer and job-processing portion of the single root Breadcrum package.
It is not a separate package or independently built service.
Shared queue/domain code lives in `src/resources/`.

Run commands from the repository root:

```sh
pnpm run watch
pnpm run start:worker
```

`watch` runs API handlers and workers in one backend process for development.
`start:worker` selects only the worker role, with an internal health listener and no public routes or frontend requirement.
Both use the root environment and the existing PostgreSQL-backed queues.
Use a different `PORT` when running a separate API process locally.

Production uses the root `Dockerfile` and `fly.toml`, with the `worker` process group in the `breadcrum` Fly app.
Only the `app` group has a public service.
Worker health checks target `/health` on port 8080; metrics use port 9092 and the `breadcrum-worker` telemetry identity.
The worker must remain running to consume jobs; HTTP autostart cannot wake it.

Deployment is manual and releases both groups together.
The old `bc-worker` name remains the Sentry project, not the target Fly app for new deployments.
Set `SENTRY_WORKER_DSN` in the app-wide environment and keep the shared image's `SENTRY_RELEASE`.
Worker runtime selects that DSN, falling back to `SENTRY_DSN` if it is absent or empty.
API and combined development roles select `SENTRY_API_DSN` with the same fallback.
Initial worker cutover, credentials, capacity, shutdown validation, and rollback require separate approval.
See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development, testing, and deployment details.

## License

AGPL-3.0-or-later
