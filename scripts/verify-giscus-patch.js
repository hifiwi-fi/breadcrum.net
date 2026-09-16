import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const iframePattern = /<iframe\s+credentialless(?:\s|>)/
const source = await readFile(new URL(import.meta.resolve('giscus')), 'utf8')
assert.match(source, iframePattern, 'The installed Giscus iframe must include the native credentialless patch')

if (process.argv.includes('--built')) {
  const publicDir = new URL('../public/', import.meta.url)
  const files = await readdir(publicDir, { recursive: true })
  let found = false
  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const bundle = await readFile(new URL(join('../public', file), import.meta.url), 'utf8')
    if (iframePattern.test(bundle)) found = true
  }
  assert.ok(found, 'A built browser bundle must contain the credentialless Giscus iframe')
}

console.log('Giscus credentialless patch verified')
