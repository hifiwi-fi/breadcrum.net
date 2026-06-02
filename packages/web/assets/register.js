/// <reference lib="dom" />

let renderAttempts = 0
const maxRenderAttempts = 50

window.addEventListener('DOMContentLoaded', scheduleTurnstileRender)
document.body?.addEventListener('htmx:afterSwap', scheduleTurnstileRender)

function scheduleTurnstileRender () {
  renderAttempts = 0
  renderTurnstile()
}

function renderTurnstile () {
  const container = document.querySelector('[data-bc-turnstile]')
  if (!container || !('dataset' in container)) return
  const containerElement = /** @type {HTMLElement} */ (container)
  if (containerElement.dataset['bcTurnstileRendered'] === 'true') return

  const sitekey = containerElement.dataset['sitekey']
  const windowApi = /** @type {Window & { turnstile?: TurnstileApi }} */ (window)

  if (!sitekey || !windowApi.turnstile) {
    renderAttempts += 1
    if (renderAttempts < maxRenderAttempts) {
      window.setTimeout(renderTurnstile, 100)
    }
    return
  }

  const form = containerElement.closest('form')
  const tokenInput = form?.elements.namedItem('turnstile_token')
  if (!tokenInput || !('value' in tokenInput)) return
  const tokenInputElement = /** @type {HTMLInputElement} */ (/** @type {unknown} */ (tokenInput))

  windowApi.turnstile.render(containerElement, {
    sitekey,
    callback (token) {
      tokenInputElement.value = token
    },
    'expired-callback' () {
      tokenInputElement.value = ''
    },
    'timeout-callback' () {
      tokenInputElement.value = ''
    },
    'error-callback' () {
      tokenInputElement.value = ''
    },
  })

  containerElement.dataset['bcTurnstileRendered'] = 'true'
}

/**
 * @typedef {object} TurnstileApi
 * @property {(container: string | HTMLElement, params?: TurnstileRenderParams) => string | null | undefined} render
 */

/**
 * @typedef {object} TurnstileRenderParams
 * @property {string} sitekey
 * @property {(token: string) => void} [callback]
 * @property {() => void} [timeout-callback]
 * @property {() => void} [expired-callback]
 * @property {() => void} [error-callback]
 */
