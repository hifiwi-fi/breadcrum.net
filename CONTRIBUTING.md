# Contributing

## Guidelines

- Patches, ideas and changes welcome.
- Fixes almost always welcome.
- Features sometimes welcome.
  - Please open an issue to discuss the issue prior to spending lots of time on the problem.
  - It may be rejected.
  - If you don't want to wait around for the discussion to commence, and you really want to jump into the implementation work, be prepared for fork if the idea is respectfully declined.
- Stay within the style of the existing code.
- All tests must pass.
- Additional features or code paths should be tested.
- Aim for 100% coverage.
- Questions are welcome, however unless there is a official support contract established between the maintainers and the requester, support is not guaranteed.
- Contributors reserve the right to walk away from this project at any moment with or without notice.

## Local development

Use Node.js 26+ and pnpm 12.x, and run commands from the repository root.
There is one private ESM package and one root lockfile; `pnpm-workspace.yaml` holds dependency patches and install policies, not workspace packages.
API routes live in `api/`, consumers in `worker/`, shared code in `resources/`, plugins in `plugins/`, browser sources in `client/`, and database migrations in `migrations/`.

```sh
pnpm install --frozen-lockfile
pnpm run generate-default-env
```

Configure the root `.env` for local PostgreSQL and Redis; the generator preserves existing files and symlinks.
Never use production services or credentials for development or tests.
`pnpm run migrate` uses root `.postgratorrc.json` and PostgreSQL environment variables, not `.env` or `DATABASE_URL`; configure those separately before migrating.

```sh
pnpm run migrate
pnpm run watch
```

`pnpm start` also runs the asset watcher and combined API/worker development backend.
`pnpm run watch:server` runs only the backend through Fastify CLI:

```sh
APP_ROLE=all node --import ./otel.js node_modules/fastify-cli/cli.js start --config ./config/fastify-cli.cjs --watch -P --ignore-watch='client public data .tap' app.js
```

`app.js` is the single application composition, with startup and graceful close configured through `config/fastify-cli.cjs`.
Use `pnpm run start:api` or `pnpm run start:worker` for non-watching startup with the corresponding `APP_ROLE`, the same telemetry preload, and CLI configuration.
`APP_ROLE` is required and must be `api`, `worker`, or `all`; `--role` is unsupported, and `all` is rejected when either `NODE_ENV` or `ENV` is `production`.
`pnpm run print-routes` and `pnpm run print-plugins` inspect the API through Fastify CLI without listeners or telemetry exporters, but still require valid API configuration, local services, and applicable built assets.

Build `client/` into `public/` with `pnpm run build`, and run checks with `pnpm test`.
Check editor diagnostics before running unit tests; use `node --test --test-reporter=dot path/to/file.test.js` for an individual suite.

## Releasing

Changelog and releases are automated with package scripts and GitHub Actions.
To create a release:

- Navigate to the Actions tab in GitHub.
- Select the `npm bump` action.
- Specify a `YYYY.M.D` version, or leave it blank for the workflow's date default.
- The action creates the release commit/tag, changelog, and GitHub release; this private package is not published to npm.
- Select the optional `deploy` checkbox only with explicit authorization to deploy the shared image to both API and worker process groups.
- An in depth review of the automation is documented here: [bret.io/projects/package-automation](https://bret.io/projects/package-automation/).

For an authorized local release, start with a clean working tree, run `npm version YYYY.M.D` with the intended version, then `pnpm run release` from the repository root.
Deployment is separate: `pnpm run deploy` performs real Sentry and Fly writes and must never be used as a validation command.
Production migrations, secret changes, and the initial worker cutover require separate authorization.
