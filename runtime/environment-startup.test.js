/** @import { TestContext } from 'node:test' */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @param {TestContext} t */
async function startupFixture (t) {
  const directory = await mkdtemp(join(tmpdir(), 'breadcrum-environment-startup-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  // Keep the real CLI/preload/application graph, without inheriting the user's .env.
  const files = ['package.json', 'app.js', 'otel.js', 'api', 'config', 'plugins', 'resources', 'runtime', 'worker']
  await Promise.all(files.map(name =>
    cp(new URL(`../${name}`, import.meta.url), join(directory, name), { recursive: true })))
  await symlink(fileURLToPath(new URL('../node_modules', import.meta.url)), join(directory, 'node_modules'), 'dir')
  assert.deepEqual((await readdir(directory)).sort(), [...files, 'node_modules'].sort())
  await writeFile(join(directory, 'runtime/telemetry.js'), "throw new Error('RESOURCE_IMPORT_REACHED')\n")
  // A missed early guard must fail before any real database/cache plugin can run.
  await writeFile(join(directory, 'plugins/shared/env.js'), "export default async function env () { throw new Error('RESOURCE_IMPORT_REACHED') }\n")
  return directory
}

/**
 * @param {string} directory
 * @param {NodeJS.ProcessEnv} environment
 * @param {string[]} [args]
 */
function runStartup (directory, environment, args = []) {
  return spawnSync(process.execPath, [
    '--import', join(directory, 'otel.js'),
    join(directory, 'node_modules/fastify-cli/cli.js'), 'start',
    '--config', join(directory, 'config/fastify-cli.cjs'),
    join(directory, 'app.js'), ...args,
  ], {
    cwd: join(directory, 'runtime'),
    env: environment,
    encoding: 'utf8',
    timeout: 10000,
    killSignal: 'SIGKILL',
  })
}

test('CLI preload rejects missing/invalid roles, production all, and invalid full config before telemetry imports', async t => {
  const directory = await startupFixture(t)
  /** @type {{ name: string, environment: NodeJS.ProcessEnv, error: RegExp }[]} */
  const cases = [
    { name: 'missing role', environment: {}, error: /APP_ROLE is required/ },
    { name: 'empty role', environment: { APP_ROLE: '' }, error: /APP_ROLE is required/ },
    { name: 'invalid role', environment: { APP_ROLE: 'web' }, error: /APP_ROLE is required/ },
    { name: 'NODE_ENV production', environment: { APP_ROLE: 'all', NODE_ENV: 'production', ENV: 'development' }, error: /APP_ROLE=all is not allowed in production/ },
    { name: 'ENV production', environment: { APP_ROLE: 'all', ENV: 'production', NODE_ENV: 'development' }, error: /APP_ROLE=all is not allowed in production/ },
    { name: 'missing API secrets', environment: { APP_ROLE: 'api' }, error: /COOKIE_SECRET|JWT_SECRET/ },
    { name: 'invalid worker config', environment: { APP_ROLE: 'worker', PORT: '65536' }, error: /PORT/ },
  ]
  for (const { name, environment, error } of cases) {
    await t.test(name, () => {
      const result = runStartup(directory, environment)
      assert.equal(result.error, undefined)
      assert.equal(result.signal, null)
      assert.equal(result.status, 1, result.stderr)
      assert.match(result.stderr, error)
      assert.doesNotMatch(result.stderr, /RESOURCE_IMPORT_REACHED/)
      assert.equal(result.stdout, '')
    })
  }
})

test('CLI rejects role flags including plugin options rather than overriding APP_ROLE', async t => {
  const directory = await startupFixture(t)
  // Let the real application reject CLI plugin options without opening telemetry resources.
  await writeFile(join(directory, 'runtime/telemetry.js'), 'export async function bootstrapTelemetry () { return { shutdown: async () => {} } }\n')
  for (const args of [
    ['--role=api'], ['--role=worker'], ['--role', 'all'],
    ['--', '--role=api'], ['--', '--role=worker'], ['--', '--role', 'all'],
  ]) {
    await t.test(args.join(' '), () => {
      const result = runStartup(directory, { APP_ROLE: 'worker' }, args)
      assert.equal(result.error, undefined, result.stderr)
      assert.equal(result.signal, null, result.stderr)
      assert.equal(result.status, 1, result.stderr)
      assert.match(result.stderr, /CLI role flags are not supported; set APP_ROLE=api\|worker\|all instead/)
      assert.doesNotMatch(result.stderr, /RESOURCE_IMPORT_REACHED|ECONNREFUSED/)
      assert.doesNotMatch(result.stdout, /Server listening at|Scheduled auth token cleanup job/)
    })
  }
})

test('CLI preload reads root dotenv independent of cwd and process APP_ROLE wins before resource imports', async t => {
  const directory = await startupFixture(t)
  await writeFile(join(directory, '.env'), 'APP_ROLE=all\nENV=production\n')
  const fromFile = runStartup(directory, {})
  assert.equal(fromFile.error, undefined)
  assert.equal(fromFile.status, 1, fromFile.stderr)
  assert.match(fromFile.stderr, /APP_ROLE=all is not allowed in production/)
  assert.doesNotMatch(fromFile.stderr, /RESOURCE_IMPORT_REACHED/)

  // A valid worker config reaches the import sentinel without starting real resources.
  const fromProcess = runStartup(directory, { APP_ROLE: 'worker' })
  assert.equal(fromProcess.error, undefined)
  assert.equal(fromProcess.status, 1, fromProcess.stderr)
  assert.match(fromProcess.stderr, /RESOURCE_IMPORT_REACHED/)
})

test('telemetry preload skips both watch parent flags but validates and imports in CLI forks', async t => {
  const directory = await startupFixture(t)
  for (const flag of ['--watch', '-w']) {
    /** @param {NodeJS.ProcessEnv} env */
    const runPreload = env => spawnSync(process.execPath, [
      '--import', join(directory, 'otel.js'),
      '--eval', "console.log('WATCH_PARENT_REACHED')", '--', flag,
    ], {
      cwd: directory,
      env,
      encoding: 'utf8',
      timeout: 10000,
      killSignal: 'SIGKILL',
    })
    // Isolate the preload decision; the integration suite exercises the real watcher.
    await t.test(`${flag} parent skips config validation and telemetry`, () => {
      const result = runPreload({})
      assert.equal(result.error, undefined)
      assert.equal(result.signal, null)
      assert.equal(result.status, 0, result.stderr)
      assert.equal(result.stdout, 'WATCH_PARENT_REACHED\n')
      assert.equal(result.stderr, '')
    })
    for (const childEvent of ['start', 'restart']) {
      await t.test(`${flag} ${childEvent} validates before importing telemetry`, () => {
        const invalid = runPreload({ childEvent })
        assert.equal(invalid.error, undefined)
        assert.equal(invalid.signal, null)
        assert.equal(invalid.status, 1, invalid.stderr)
        assert.equal(invalid.stdout, '')
        assert.match(invalid.stderr, /APP_ROLE is required/)
        assert.doesNotMatch(invalid.stderr, /RESOURCE_IMPORT_REACHED/)

        const valid = runPreload({ APP_ROLE: 'worker', childEvent })
        assert.equal(valid.error, undefined)
        assert.equal(valid.signal, null)
        assert.equal(valid.status, 1, valid.stderr)
        assert.equal(valid.stdout, '')
        assert.match(valid.stderr, /RESOURCE_IMPORT_REACHED/)
      })
    }
  }
})
