import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFile, mkdtemp, mkdir, readFile, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

/** @import { TestContext } from 'node:test' */

/** @param {TestContext} t */
async function fixture (t) {
  const dir = await mkdtemp(join(tmpdir(), 'breadcrum-scripts-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const bin = join(dir, 'bin')
  await mkdir(bin)
  return { dir, bin }
}

/**
 * @param {string} bin
 * @param {string} name
 * @param {string} body
 */
async function stub (bin, name, body) {
  await writeFile(join(bin, name), `#!/bin/sh\nset -eu\n${body}\n`, { mode: 0o755 })
}

/**
 * @param {string} name
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} env
 */
function runScript (name, cwd, env) {
  return spawnSync('/bin/bash', [fileURLToPath(new URL(name, import.meta.url))], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 10_000,
  })
}

/** @param {TestContext} t */
async function generatorFixture (t) {
  const { dir } = await fixture(t)
  // Copy only the real generator and data-only schema graph, never local env files.
  const files = [
    'scripts/api/generate-default-env.js',
    'src/runtime/env-schema.js',
    'src/runtime/env-fragments.js',
    'src/runtime/role.js',
    'src/resources/fastify-common/env-schema.js',
  ]
  for (const file of files) {
    const destination = join(dir, file)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(new URL(`../${file}`, import.meta.url), destination)
  }
  await writeFile(join(dir, 'package.json'), JSON.stringify({
    type: 'module',
    imports: {
      '#runtime/*': './src/runtime/*',
      '#resources/*': './src/resources/*',
    },
  }))
  return dir
}

/**
 * @param {string} dir
 * @param {string} [environment]
 */
function runGenerator (dir, environment = 'development') {
  return spawnSync(process.execPath, [join(dir, 'scripts/api/generate-default-env.js')], {
    cwd: join(dir, 'scripts/api'),
    env: { ENV: environment },
    encoding: 'utf8',
    timeout: 10_000,
  })
}

test('env generator uses unified defaults and writes only the root env without pinning telemetry roles', async t => {
  const dir = await generatorFixture(t)
  await writeFile(join(dir, 'scripts', '.env'), 'LEGACY_SCRIPT_ENV=preserved\n')
  await writeFile(join(dir, 'scripts', 'api', '.env'), 'CALLER_ENV=preserved\n')
  const result = runGenerator(dir)
  assert.equal(result.status, 0, result.stderr)
  const env = parseEnv(await readFile(join(dir, '.env'), 'utf8'))
  assert.equal(env['HOST'], 'localhost:3000')
  assert.equal(env['LISTEN_HOST'], '0.0.0.0')
  assert.equal(env['SHUTDOWN_TIMEOUT_MS'], '45000')
  assert.equal(env['JOB_DRAIN_TIMEOUT_MS'], '30000')
  assert.equal(env['EPISODE_WORKER_CONCURRENCY'], '2')
  assert.equal(env['METRICS'], '1')
  assert.equal(env['OTEL_SERVICE_NAME'], undefined)
  assert.equal(env['METRICS_PORT'], undefined)
  assert.match(env['COOKIE_SECRET'] ?? '', /^[a-f0-9]{64}$/)
  assert.match(env['JWT_SECRET'] ?? '', /^[a-f0-9]{64}$/)
  assert.notEqual(env['COOKIE_SECRET'], env['JWT_SECRET'])
  assert.equal((await stat(join(dir, '.env'))).mode & 0o777, 0o600)
  assert.equal(await readFile(join(dir, 'scripts', '.env'), 'utf8'), 'LEGACY_SCRIPT_ENV=preserved\n')
  assert.equal(await readFile(join(dir, 'scripts', 'api', '.env'), 'utf8'), 'CALLER_ENV=preserved\n')
})

test('env generator preserves an existing root file', async t => {
  const dir = await generatorFixture(t)
  await writeFile(join(dir, '.env'), 'LOCAL_TEST=preserved\n')
  const result = runGenerator(dir)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(await readFile(join(dir, '.env'), 'utf8'), 'LOCAL_TEST=preserved\n')
})

test('env generator preserves an existing root symlink and its target', async t => {
  const dir = await generatorFixture(t)
  const target = join(dir, 'shared.env')
  await writeFile(target, 'LOCAL_TEST=preserved\n')
  await symlink(target, join(dir, '.env'))
  const result = runGenerator(dir)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(await readlink(join(dir, '.env')), target)
  assert.equal(await readFile(target, 'utf8'), 'LOCAL_TEST=preserved\n')
})

test('env generator preserves a dangling root symlink without creating its target', async t => {
  const dir = await generatorFixture(t)
  const target = join(dir, 'missing.env')
  await symlink(target, join(dir, '.env'))
  const result = runGenerator(dir)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(await readlink(join(dir, '.env')), target)
  await assert.rejects(readFile(target), { code: 'ENOENT' })
})

test('env generator does not create an env file in production', async t => {
  const dir = await generatorFixture(t)
  const result = runGenerator(dir, 'production')
  assert.equal(result.status, 0, result.stderr)
  await assert.rejects(readFile(join(dir, '.env')), { code: 'ENOENT' })
})

test('worktree setup links only absent root env and preserves files and dangling links', async t => {
  const { dir, bin } = await fixture(t)
  const main = join(dir, 'main worktree')
  const target = join(dir, 'new worktree')
  const log = join(dir, 'pnpm.log')
  await mkdir(join(main, 'data', 'geoip'), { recursive: true })
  await mkdir(target)
  await writeFile(join(main, '.env'), 'LOCAL_TEST=main\n')
  await writeFile(join(main, 'data', 'geoip', 'database.mmdb'), 'test database')
  await stub(bin, 'pnpm', 'printf "%s\\n" "$*" >> "$TRACE_FILE"')
  const env = {
    PATH: `${bin}:/usr/bin:/bin`,
    TRACE_FILE: log,
    ZED_MAIN_GIT_WORKTREE: main,
    ZED_WORKTREE_ROOT: target,
  }

  const first = runScript('setup-worktree.sh', dir, env)
  assert.equal(first.status, 0, first.stderr)
  assert.equal(await readlink(join(target, '.env')), join(main, '.env'))
  assert.equal(await readFile(join(target, 'data', 'geoip', 'database.mmdb'), 'utf8'), 'test database')
  assert.equal(await readFile(log, 'utf8'), 'install --frozen-lockfile\n')

  await rm(join(target, '.env'))
  await writeFile(join(target, '.env'), 'LOCAL_TEST=preserved\n')
  await writeFile(join(target, 'data', 'geoip', 'database.mmdb'), 'preserved database')
  const second = runScript('setup-worktree.sh', dir, env)
  assert.equal(second.status, 0, second.stderr)
  assert.equal(await readFile(join(target, '.env'), 'utf8'), 'LOCAL_TEST=preserved\n')
  assert.equal(await readFile(join(target, 'data', 'geoip', 'database.mmdb'), 'utf8'), 'preserved database')

  await rm(join(target, '.env'))
  const missing = join(dir, 'missing.env')
  await symlink(missing, join(target, '.env'))
  const third = runScript('setup-worktree.sh', dir, env)
  assert.equal(third.status, 0, third.stderr)
  assert.equal(await readlink(join(target, '.env')), missing)
  await assert.rejects(readFile(missing), { code: 'ENOENT' })
  assert.equal(await readFile(join(main, '.env'), 'utf8'), 'LOCAL_TEST=main\n')
})

test('env linker handles spaced paths and preserves existing links', async t => {
  const { dir, bin } = await fixture(t)
  const main = join(dir, 'main worktree')
  const target = join(dir, 'other worktree')
  await mkdir(main)
  await mkdir(target)
  await writeFile(join(main, '.env'), 'LOCAL_TEST=main\n')
  await stub(bin, 'git', 'printf "worktree %s\\0\\0worktree %s\\0\\0" "$MAIN" "$TARGET"')
  const env = { PATH: bin, MAIN: main, TARGET: target }
  // Only the symlink utility is allowed in addition to the mocked git command.
  await symlink('/bin/ln', join(bin, 'ln'))
  const first = runScript('link-env-files.sh', dir, env)
  assert.equal(first.status, 0, first.stderr)
  assert.equal(await readlink(join(target, '.env')), join(main, '.env'))
  await rm(join(target, '.env'))
  const missing = join(dir, 'missing.env')
  await symlink(missing, join(target, '.env'))
  const second = runScript('link-env-files.sh', dir, env)
  assert.equal(second.status, 0, second.stderr)
  assert.equal(await readlink(join(target, '.env')), missing)
})

/**
 * @param {TestContext} t
 * @param {number} exitCode
 */
async function mockDeployment (t, exitCode) {
  const { dir, bin } = await fixture(t)
  const log = join(dir, 'commands.log')
  await stub(bin, 'git', 'printf "test-sha\\n"')
  await stub(bin, 'pnpm', 'printf "pnpm %s\\n" "$*" >> "$TRACE_FILE"')
  await stub(bin, 'flyctl', 'printf "flyctl %s\\n" "$*" >> "$TRACE_FILE"\nexit "$FLY_EXIT"')
  // No inherited PATH, credentials, or real CLI can reach an external service.
  const result = runScript('deploy-with-sentry.sh', dir, {
    PATH: bin,
    TRACE_FILE: log,
    FLY_EXIT: String(exitCode),
    SENTRY_RELEASE: 'test-release',
    SENTRY_DEPLOY_NAME: 'test-deploy',
    SENTRY_BROWSER_DSN: 'https://public@example.invalid/1',
    SENTRY_API_DSN: 'https://api-only@example.invalid/2',
    SENTRY_WORKER_DSN: 'https://worker-only@example.invalid/3',
  })
  assert.equal(result.status, exitCode, result.stderr)
  const commands = (await readFile(log, 'utf8')).trim().split('\n')
  const deploys = commands.filter(line => line.startsWith('flyctl deploy '))
  assert.equal(deploys.length, 1)
  assert.match(deploys[0] ?? '', /--config fly.toml --dockerfile Dockerfile --build-arg SENTRY_RELEASE=test-release/)
  assert.match(deploys[0] ?? '', /--build-arg SENTRY_BROWSER_DSN=https:\/\/public@example.invalid\/1/)
  assert.doesNotMatch(deploys[0] ?? '', /SENTRY_API_DSN|SENTRY_WORKER_DSN|api-only|worker-only/)
  const releases = commands.filter(line => line.includes('sentry-cli releases '))
  for (const release of releases) {
    assert.match(release, /--project breadcrum --project bc-worker/)
  }
  return commands
}

test('deploy helper associates both projects and records success after one deployment', async t => {
  const commands = await mockDeployment(t, 0)
  assert.match(commands.at(-1) ?? '', /releases deploys test-release new/)
  assert.match(commands.at(-2) ?? '', /releases finalize test-release/)
})

test('deploy helper does not finalize a failed deployment', async t => {
  const commands = await mockDeployment(t, 1)
  assert.equal(commands.some(line => line.includes('releases finalize ')), false)
  assert.equal(commands.some(line => line.includes('releases deploys ')), false)
  assert.match(commands.at(-1) ?? '', /^flyctl deploy /)
})
