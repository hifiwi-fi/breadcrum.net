import { test, suite } from 'node:test'
import assert from 'node:assert'
import { page } from './client.js'
import { render } from 'uland-isomorphic'

suite('Main client page tests', () => {
  test('Main page component renders without errors', async (t) => {
    let rendered
    assert.doesNotThrow(() => {
      rendered = render(String, page)
    }, 'page renders without throwing exceptions')
    assert.strictEqual(typeof rendered, 'string', 'page renders to a string value')
  })
})
