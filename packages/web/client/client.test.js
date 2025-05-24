import { test } from 'node:test'
import assert from 'node:assert'
import { page } from './client.js'
import { render } from 'uland-isomorphic'

test('Testing is set up and working', async (t) => {
  let rendered
  assert.doesNotThrow(() => {
    rendered = render(String, page)
  })
  assert.strictEqual(typeof rendered, 'string')
})
