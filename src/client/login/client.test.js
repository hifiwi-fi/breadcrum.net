/// <reference lib="dom" />

import { test, suite } from 'node:test'
import assert from 'node:assert'
import { Page } from './client.js'
import { QueryProvider } from '../lib/query-provider.js'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { JSDOM } from 'jsdom'

suite('Login Page Tests', () => {
  test('Login page component renders without errors', async () => {
    let rendered
    assert.doesNotThrow(() => {
      rendered = render(html`<${QueryProvider}><${Page}/><//>`)
    }, 'page renders without error')
    assert.strictEqual(typeof rendered, 'string', 'page renders to string')
  })

  test('login without WebAuthn does not start conditional mediation or disable password login', async t => {
    const dom = new JSDOM('<main></main>', { url: 'http://example.com/login' })
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const credentialDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'PublicKeyCredential')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document })
    Reflect.deleteProperty(globalThis, 'PublicKeyCredential')
    const container = dom.window.document.querySelector('main')
    assert.ok(container)
    t.after(async () => {
      await act(() => { renderDOM(null, container) })
      dom.window.close()
      for (const [key, descriptor] of /** @type {const} */ ([
        ['window', windowDescriptor],
        ['document', documentDescriptor],
        ['PublicKeyCredential', credentialDescriptor],
      ])) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
    })
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }))
    const errorMock = t.mock.method(console, 'error', () => {})

    await act(async () => { renderDOM(html`<${QueryProvider}><${Page}/><//>`, container) })

    assert.ok(fetchMock.mock.callCount() > 0, 'checks the existing login session')
    assert.ok(fetchMock.mock.calls.every(call => call.arguments[0] === '/api/user'), 'does not request a passkey challenge')
    assert.strictEqual(errorMock.mock.callCount(), 0, 'unsupported WebAuthn is not an authentication failure')
    assert.strictEqual(container.querySelector('fieldset')?.disabled, false)
    assert.ok(container.querySelector('input[name="password"]'))
    assert.ok(!container.textContent?.includes('PublicKeyCredential'))
  })
})
