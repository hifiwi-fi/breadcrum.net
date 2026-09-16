/** @import { TestContext } from 'node:test' */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @param {TestContext} t */
async function startupFixture (t) {
  const directory = await mkdtemp(join(tmpdir(), 'breadcrum-environment-startup-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  // Copy the real config/startup graph without the user's .env or resource plugins.
  for (const file of [
    'src/main.js',
    'src/config/config.js',
    'src/config/role.js',
    'src/config/env-schema.js',
    'src/config/env-fragments.js',
    'src/resources/fastify-common/env-schema.js',
    'src/runtime/shutdown.js',
  ]) {
    const destination = join(directory, file)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(new URL(`../../${file}`, import.meta.url), destination)
  }
  await writeFile(join(directory, 'package.json'), JSON.stringify({
    type: 'module',
    imports: {
      '#config/*': './src/config/*',
      '#resources/*': './src/resources/*',
    },
  }))
  await symlink(fileURLToPath(new URL('../../node_modules', import.meta.url)), join(directory, 'node_modules'), 'dir')
  for (const file of ['src/runtime/telemetry.js', 'src/app.js']) {
    await writeFile(join(directory, file), "throw new Error('RESOURCE_IMPORT_REACHED')\n")
  }
  return directory
}

/**
 * @param {string} directory
 * @param {NodeJS.ProcessEnv} environment
 * @param {string[]} [args]
 */
function runStartup (directory, environment, args = []) {
  return spawnSync(process.execPath, [join(directory, 'src/main.js'), ...args], {
    cwd: join(directory, 'src'),
    env: environment,
    encoding: 'utf8',
    timeout: 10000,
    killSignal: 'SIGKILL',
  })
}

test('main rejects missing/invalid roles, production all, and invalid full config before resource imports', async t => {
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

test('main rejects every extra argument instead of allowing CLI role overrides', async t => {
  const directory = await startupFixture(t)
  for (const args of [['--role=api'], ['--role=worker'], ['--role', 'all'], ['--unknown'], ['worker'], ['--']]) {
    const result = runStartup(directory, { APP_ROLE: 'worker' }, args)
    assert.equal(result.error, undefined)
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /CLI arguments are not supported; set APP_ROLE=api\|worker\|all in the environment instead/)
    assert.doesNotMatch(result.stderr, /RESOURCE_IMPORT_REACHED/)
  }
})

test('main reads root dotenv independent of cwd and process APP_ROLE wins before resource imports', async t => {
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
