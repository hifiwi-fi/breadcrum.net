import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('../', import.meta.url))
const helper = new URL('./test/client-build-fixture.js', import.meta.url).href

for (const suite of ['fullSite', 'watchSite']) {
  test(`client build integration: ${suite}`, { timeout: 30_000 }, async t => {
    const dir = await mkdtemp(join(tmpdir(), 'breadcrum-client-build-'))
    t.after(() => rm(dir, { recursive: true, force: true }))
    await Promise.all([
      cp(join(root, 'client'), join(dir, 'client'), { recursive: true }),
      cp(join(root, 'src'), join(dir, 'src'), { recursive: true }),
      cp(join(root, 'package.json'), join(dir, 'package.json')),
      symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir'),
    ])

    // A separate cwd isolates loadEnvFile(), package aliases, and all watch edits.
    // Do not inherit application credentials or NODE_OPTIONS preloads from the caller.
    const program = `
      import { test } from 'node:test'
      import { ${suite} } from ${JSON.stringify(helper)}
      test(${JSON.stringify(suite)}, { timeout: 25_000 }, ${suite})
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
}
