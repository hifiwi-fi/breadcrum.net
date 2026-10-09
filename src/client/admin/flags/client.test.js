import { test, suite } from 'node:test'
import assert from 'node:assert'
import { Page } from './client.js'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'

suite('Admin Flags Page Tests', () => {
  test('Admin flags page component renders without errors', async () => {
    let rendered
    assert.doesNotThrow(() => {
      rendered = render(html`<${Page}/>`)
    }, 'page renders without error')
    assert.strictEqual(typeof rendered, 'string', 'page renders to string')
  })
})
