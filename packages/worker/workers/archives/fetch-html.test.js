import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { fetchHTML } from './fetch-html.js'

test('fetchHTML should fetch HTML content from breadcrum.net blog post', async (_t) => {
  // TODO: Make this pass when the site is down.
  const url = new URL('https://breadcrum.net/blog/2025/whats-going-on-with-episodes/')

  const html = await fetchHTML({ url })

  // Basic assertions
  assert.ok(typeof html === 'string', 'Should return a string')
  assert.ok(html.length > 0, 'Should return non-empty content')
  assert.ok(html.includes('<html'), 'Should contain HTML structure')
  assert.ok(html.includes('episodes'), 'Should contain the word "episodes" from the URL')
})

test('fetchHTML should handle gzipped responses', async (_t) => {
  // Test with a URL that likely returns gzipped content
  const url = new URL('https://breadcrum.net/')

  const html = await fetchHTML({ url })

  assert.ok(typeof html === 'string', 'Should return a string')
  assert.ok(html.length > 0, 'Should return non-empty content')
  assert.ok(html.includes('<html') || html.includes('<!DOCTYPE'), 'Should contain HTML structure')
})
