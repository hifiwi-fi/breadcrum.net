import { test, suite } from 'node:test'
import assert from 'node:assert'
import { page } from './client.js'
import { render } from 'uland-isomorphic'

suite('Password Reset Page Tests', () => {
  test('Password reset request page renders without errors', async () => {
    let rendered
    assert.doesNotThrow(() => {
      rendered = render(String, page)
    }, 'page renders without error')
    assert.strictEqual(typeof rendered, 'string', 'page renders to string')
  })
})
