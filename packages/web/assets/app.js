/// <reference lib="dom" />

document.body?.addEventListener('htmx:responseError', event => {
  console.error('htmx response error', event)
})

/** @type {WeakSet<HTMLVideoElement | HTMLAudioElement>} */
const mediaWithListeners = new WeakSet()

/** @type {Promise<void> | null} */
let twitterWidgetsPromise = null

/** @type {Promise<void> | null} */
let blueskyEmbedPromise = null

document.body?.addEventListener('click', event => {
  const target = event.target
  if (!(target instanceof globalThis.Element)) return

  const embedButton = target.closest('[data-bc-embed-activate]')
  if (embedButton instanceof globalThis.HTMLButtonElement) {
    activateEmbed(embedButton)
    return
  }

  const mediaButton = target.closest('[data-bc-media-activate]')
  if (mediaButton instanceof globalThis.HTMLButtonElement) {
    activateMedia(mediaButton)
    return
  }

  const copyButton = target.closest('[data-bc-copy-text]')
  if (copyButton instanceof globalThis.HTMLButtonElement) {
    copyText(copyButton)
    return
  }

  const copySelect = target.closest('[data-bc-copy-select]')
  if (copySelect instanceof globalThis.HTMLInputElement) {
    copySelect.select()
  }
})

document.addEventListener('DOMContentLoaded', () => {
  attachMediaListeners(document)
})

document.body?.addEventListener('htmx:afterSettle', event => {
  attachMediaListeners(document)
  restoreSwapFocus(event)
})

/**
 * @param {Event} event
 * @returns {void}
 */
function restoreSwapFocus (event) {
  const target = htmxEventTarget(event)
  if (!target) return

  if (target.id === 'bc-main') {
    target.focus({ preventScroll: true })
    return
  }

  const alert = target.matches('[role="alert"]')
    ? target
    : target.querySelector('[role="alert"]')

  if (alert instanceof globalThis.HTMLElement) {
    alert.tabIndex = -1
    alert.focus({ preventScroll: false })
  }
}

/**
 * @param {Event} event
 * @returns {HTMLElement | null}
 */
function htmxEventTarget (event) {
  if (event instanceof globalThis.CustomEvent) {
    const detail = /** @type {{ target?: unknown }} */ (event.detail)
    if (detail.target instanceof globalThis.HTMLElement) return detail.target
  }

  if (!(event.target instanceof globalThis.HTMLElement)) return null
  if (event.target === document.body || event.target === document.documentElement) return null

  return event.target
}

/**
 * @param {HTMLButtonElement} button
 * @returns {void}
 */
function activateEmbed (button) {
  const container = button.closest('.bc-episode-embed')
  const template = container?.querySelector('template[data-bc-embed-template]')
  if (!(container instanceof globalThis.HTMLElement) || !(template instanceof globalThis.HTMLTemplateElement)) return

  const wrapper = document.createElement('div')
  wrapper.className = 'bc-episode-embed-html'
  wrapper.style.cssText = button.getAttribute('style') ?? ''
  wrapper.append(template.content.cloneNode(true))
  button.replaceWith(wrapper)

  if (container.classList.contains('bc-episode-embed--twitter')) {
    loadTwitterWidgets()
      .then(() => {
        const browserWindow = /** @type {Window & { twttr?: { widgets?: { load?: (element?: Element) => void } } }} */ (window)
        browserWindow.twttr?.widgets?.load?.(wrapper)
      })
      .catch(() => {})
  }

  if (container.classList.contains('bc-episode-embed--bluesky')) {
    loadBlueskyEmbed()
      .then(() => {
        const browserWindow = /** @type {Window & { bluesky?: { scan?: (element?: Element) => void } }} */ (window)
        browserWindow.bluesky?.scan?.(wrapper)
      })
      .catch(() => {})
  }
}

/**
 * @param {HTMLButtonElement} button
 * @returns {void}
 */
function activateMedia (button) {
  const src = button.dataset['bcMediaSrc']
  const type = button.dataset['bcMediaType']
  if (!src || !type) return

  const media = createMediaElement({
    src,
    type,
    thumbnail: button.dataset['bcMediaThumbnail'] || '',
  })

  if (!media) return

  button.replaceWith(media)
  attachMediaElement(media)
  media.play().catch(() => {})
  media.focus()
}

/**
 * @param {HTMLButtonElement} button
 * @returns {void}
 */
function copyText (button) {
  const value = button.dataset['bcCopyText']
  if (!value) return

  navigator.clipboard.writeText(value)
    .then(() => {
      button.textContent = 'Copied'
    })
    .catch(error => {
      console.error(error)
      button.textContent = 'Error'
    })
}

/**
 * @param {object} params
 * @param {string} params.src
 * @param {string} params.type
 * @param {string} params.thumbnail
 * @returns {HTMLVideoElement | HTMLAudioElement | null}
 */
function createMediaElement ({ src, type, thumbnail }) {
  if (type === 'video') {
    const video = document.createElement('video')
    video.className = 'bc-cors-video'
    video.controls = true
    video.src = src
    video.preload = 'none'
    video.tabIndex = 0
    if (thumbnail) video.poster = thumbnail
    return video
  }

  if (type === 'audio') {
    const audio = document.createElement('audio')
    audio.className = 'bc-cors-audio'
    audio.controls = true
    audio.src = src
    audio.preload = 'none'
    audio.tabIndex = 0
    return audio
  }

  return null
}

/**
 * @param {ParentNode} root
 * @returns {void}
 */
function attachMediaListeners (root) {
  for (const media of root.querySelectorAll('[data-bc-cors-media]')) {
    if (media instanceof globalThis.HTMLVideoElement || media instanceof globalThis.HTMLAudioElement) {
      attachMediaElement(media)
    }
  }
}

/**
 * @param {HTMLVideoElement | HTMLAudioElement} media
 * @returns {void}
 */
function attachMediaElement (media) {
  if (mediaWithListeners.has(media)) return
  mediaWithListeners.add(media)

  media.addEventListener('error', () => {
    if (media.error?.code !== 4) return
    if (media.crossOrigin === 'anonymous') return

    media.crossOrigin = 'anonymous'
    media.load()
    media.play().catch(() => {})
    media.focus()
  })

  media.addEventListener('keydown', event => {
    if (!(event instanceof globalThis.KeyboardEvent)) return
    if (event.key !== 'Enter') return

    if (media.paused) media.play().catch(() => {})
    else media.pause()
  })
}

/**
 * @returns {Promise<void>}
 */
function loadTwitterWidgets () {
  if (twitterWidgetsPromise) return twitterWidgetsPromise
  twitterWidgetsPromise = loadScript('https://platform.twitter.com/widgets.js')
  return twitterWidgetsPromise
}

/**
 * @returns {Promise<void>}
 */
function loadBlueskyEmbed () {
  if (blueskyEmbedPromise) return blueskyEmbedPromise
  blueskyEmbedPromise = loadScript('https://embed.bsky.app/static/embed.js')
  return blueskyEmbedPromise
}

/**
 * @param {string} src
 * @returns {Promise<void>}
 */
function loadScript (src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing instanceof globalThis.HTMLScriptElement) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.append(script)
  })
}
