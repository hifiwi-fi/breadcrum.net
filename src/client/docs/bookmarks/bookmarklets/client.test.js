/// <reference lib="dom" />

import { test, suite } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { setupBookmarkletCopy } from './client.js'

suite('Bookmarklet copy', () => {
  test('copies the bookmarklet and reports success', async () => {
    const dom = new JSDOM('<div id="copy"></div>')
    const container = /** @type {HTMLElement | null} */ (/** @type {unknown} */ (dom.window.document.querySelector('#copy')))
    assert.ok(container)
    /** @type {string[]} */
    const copied = []
    setupBookmarkletCopy(container, 'javascript:alert(1)', async text => { copied.push(text) })

    const button = container.querySelector('button')
    assert.ok(button)
    button.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.deepStrictEqual(copied, ['javascript:alert(1)'])
    assert.strictEqual(button.textContent, 'Copied')
    dom.window.close()
  })

  test('reports clipboard failures', async t => {
    const dom = new JSDOM('<div id="copy"></div>')
    const container = /** @type {HTMLElement | null} */ (/** @type {unknown} */ (dom.window.document.querySelector('#copy')))
    assert.ok(container)
    const errorMock = t.mock.method(console, 'error', () => {})
    setupBookmarkletCopy(container, 'javascript:alert(1)', async () => {
      throw new Error('clipboard unavailable')
    })

    const button = container.querySelector('button')
    assert.ok(button)
    button.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    assert.strictEqual(button.textContent, 'Error')
    assert.strictEqual(errorMock.mock.callCount(), 1)
    dom.window.close()
  })
})
