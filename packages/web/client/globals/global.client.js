/// <reference lib="dom" />

import * as Sentry from '@sentry/browser'
// @ts-expect-error - No type definitions available for mine.css
import { toggleTheme } from 'mine.css'
import 'fragmentions'
import { html } from 'htm/preact'
import { render } from 'preact'
import { Header } from '../components/header/index.js'
import { initializePwa } from './pwa-runtime.js'
import { isSkippedViewTransitionAbortError } from './sentry-filters.js'

const sentryDsn = process.env['SENTRY_BROWSER_DSN']

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env['SENTRY_ENVIRONMENT'] || undefined,
    release: process.env['SENTRY_RELEASE'] || undefined,
    dataCollection: {
      // userInfo: false,
      // httpBodies: [],
    },
    beforeSend (event, hint) {
      if (isSkippedViewTransitionAbortError(event, hint)) return null

      return event
    },
  })
}

// @ts-expect-error - Adding toggleTheme to global window object
window.toggleTheme = toggleTheme

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-header')
  if (container) {
    render(html`<${Header} />`, container)
  }
}

initializeConnectionStatus()

initializePwa().catch(err => {
  console.error('PWA initialization failed:', err)
})

/** Update the footer online/offline indicator. */
function initializeConnectionStatus () {
  const status = document.querySelector('[data-connection-status]')
  const label = document.querySelector('[data-connection-status-label]')

  if (!(status instanceof HTMLElement) || !(label instanceof HTMLElement)) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeConnectionStatus, { once: true })
    }
    return
  }

  const update = () => {
    const online = navigator.onLine
    status.dataset['online'] = String(online)
    label.textContent = online ? 'Online' : 'Offline'
    status.title = online ? 'Connection status: online' : 'Connection status: offline'
  }

  update()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
}
