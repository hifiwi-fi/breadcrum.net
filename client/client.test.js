import { test, suite } from 'node:test'
import assert from 'node:assert'
import { Page } from './client.js'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'

suite('Main client page tests', () => {
  test('Main page component renders without errors', async () => {
    let rendered
    assert.doesNotThrow(() => {
      rendered = render(html`<${Page}/>`)
    }, 'page renders without throwing exceptions')
    assert.strictEqual(typeof rendered, 'string', 'page renders to a string value')
  })
})
