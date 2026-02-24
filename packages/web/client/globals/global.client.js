/// <reference lib="dom" />

// @ts-expect-error - No type definitions available for mine.css
import { toggleTheme } from 'mine.css'
import 'fragmentions'
import { html } from 'htm/preact'
import { render } from 'preact'
import { Header } from '../components/header/index.js'
import { QueryProvider } from '../lib/query-provider.js'

// @ts-expect-error - Adding toggleTheme to global window object
window.toggleTheme = toggleTheme

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-header')
  if (container) {
    render(html`<${QueryProvider}><${Header} /><//>`, container)
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(registration => {
      console.log('Service Worker registered successfully:', registration.scope)
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error)
    })
}
