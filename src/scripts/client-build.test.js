import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('../../', import.meta.url))
const helper = new URL('./test/client-build-fixture.js', import.meta.url).href

test('client build integration: fullSite', { timeout: 30_000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'breadcrum-client-build-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const files = ['src', 'package.json']
  await Promise.all([
    ...files.map(name => cp(join(root, name), join(dir, name), { recursive: true })),
    symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir'),
  ])
  assert.deepEqual((await readdir(dir)).sort(), [...files, 'node_modules'].sort())

  // A separate cwd isolates loadEnvFile(), package aliases, and caller environment.
  const program = `
    import { test } from 'node:test'
    import { fullSite } from ${JSON.stringify(helper)}
    test('fullSite', { timeout: 25_000 }, fullSite)
  `
  const runner = join(dir, 'build.test.js')
  await writeFile(runner, program)
  const result = await exec(process.execPath, ['--test', '--test-reporter=tap', runner], {
    cwd: dir,
    env: {
      PATH: process.env['PATH'],
      HOME: dir,
      TMPDIR: dir,
      HOST: 'build.example.test',
      TRANSPORT: 'https',
      NODE_ENV: 'test',
    },
    timeout: 28_000,
    maxBuffer: 2 * 1024 * 1024,
    signal: t.signal,
  })
  assert.match(result.stdout, /# fail 0\b/, result.stdout + result.stderr)
  assert.doesNotMatch(result.stdout, /# (?:cancelled|skipped) [1-9]/)
  t.diagnostic(result.stdout.match(/# tests \d+/)?.[0] ?? result.stdout)
})
