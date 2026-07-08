import { test, suite } from 'node:test'
import assert from 'node:assert'
import { Page } from './client.js'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'

suite('Admin Cache Inspector Page Tests', () => {
  test('cache inspector page renders without errors', async () => {
    /** @type {string | undefined} */
    let rendered
    assert.doesNotThrow(() => {
      rendered = render(html`<${Page} />`)
    }, 'page renders without error')
    if (typeof rendered !== 'string') assert.fail('page renders to string')
    assert.match(rendered, /Cache Inspector/)
  })
})
