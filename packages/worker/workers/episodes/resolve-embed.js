/**
 * @import { FastifyInstance } from 'fastify'
 * @import { EmbedResult } from '@breadcrum/resources/episodes/oembed.js'
 */

import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import {
  resolveEmbed,
  defaultOembedProviders,
  oembedCacheTtl,
} from '@breadcrum/resources/episodes/oembed.js'

const dpWindow = new JSDOM('').window
const DOMPurify = createDOMPurify(dpWindow)

const embedSanitizeConfig = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: [
    'allow',
    'allowfullscreen',
    'frameborder',
    'height',
    'loading',
    'referrerpolicy',
    'src',
    'title',
    'width',
  ],
}

/**
 * @param {object} params
 * @param {FastifyInstance} params.fastify
 * @param {string} params.url
 * @returns {Promise<EmbedResult | null>}
 */
export async function resolveEpisodeEmbed ({ fastify, url }) {
  const cache = fastify.cache

  const embed = await resolveEmbed({
    url,
    cache,
    cacheTtlMs: oembedCacheTtl,
    oembedProviders: defaultOembedProviders,
  })

  if (!embed) return null
  if (typeof embed.html !== 'string') return embed

  if (isTwitterEmbed(embed)) {
    const sanitizedTwitterHtml = sanitizeTwitterHtml(embed.html)
    if (!sanitizedTwitterHtml) return null
    return { ...embed, html: sanitizedTwitterHtml }
  }

  if (isBlueskyEmbed(embed)) {
    const sanitizedBlueskyHtml = sanitizeBlueskyHtml(embed.html)
    if (!sanitizedBlueskyHtml) return null
    return { ...embed, html: sanitizedBlueskyHtml }
  }

  const sanitized = DOMPurify.sanitize(embed.html, embedSanitizeConfig)
  if (!sanitized || sanitized.trim().length === 0) return null

  return {
    ...embed,
    html: sanitized,
  }
}

/**
 * @param {EmbedResult} embed
 * @returns {boolean}
 */
function isTwitterEmbed (embed) {
  return embed.provider_name === 'Twitter'
}

/**
 * @param {EmbedResult} embed
 * @returns {boolean}
 */
function isBlueskyEmbed (embed) {
  return embed.provider_name === 'Bluesky Social' || embed.provider_name === 'Bluesky'
}

/**
 * Validate Bluesky oEmbed HTML and strip script tags.
 * Rejects the HTML if any script src is not exactly embed.bsky.app/static/embed.js,
 * or if no <blockquote class="bluesky-embed"> is present.
 * Returns the HTML with script tags removed (the client loads embed.js itself).
 *
 * @param {string} html
 * @returns {string | null}
 */
function sanitizeBlueskyHtml (html) {
  const dom = new JSDOM(html)
  const doc = dom.window.document.body

  const scripts = doc.querySelectorAll('script')
  for (const script of scripts) {
    let srcUrl
    try {
      srcUrl = new URL(script.getAttribute('src') || '')
    } catch {
      return null
    }
    if (srcUrl.origin !== 'https://embed.bsky.app' || srcUrl.pathname !== '/static/embed.js') {
      return null
    }
    script.remove()
  }

  const blockquotes = doc.querySelectorAll('blockquote.bluesky-embed')
  if (blockquotes.length === 0) return null

  const result = doc.innerHTML.trim()
  if (result.length === 0) return null

  return result
}

/**
 * Validate Twitter oEmbed HTML and strip script tags.
 * Rejects the HTML if any script src is not exactly platform.twitter.com/widgets.js,
 * or if no <blockquote class="twitter-tweet"> is present.
 * Returns the HTML with script tags removed (the client loads widgets.js itself).
 *
 * @param {string} html
 * @returns {string | null}
 */
function sanitizeTwitterHtml (html) {
  const dom = new JSDOM(html)
  const doc = dom.window.document.body

  const scripts = doc.querySelectorAll('script')
  for (const script of scripts) {
    let srcUrl
    try {
      srcUrl = new URL(script.getAttribute('src') || '')
    } catch {
      return null
    }
    if (srcUrl.origin !== 'https://platform.twitter.com' || srcUrl.pathname !== '/widgets.js') {
      return null
    }
    script.remove()
  }

  const blockquotes = doc.querySelectorAll('blockquote.twitter-tweet')
  if (blockquotes.length === 0) return null

  const result = doc.innerHTML.trim()
  if (result.length === 0) return null

  return result
}
