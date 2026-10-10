/// <reference lib="dom" />

/** @import { TypeEpisodeReadClient } from '#routes/api/episodes/schemas/schema-episode-read.js' */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render } from 'preact-render-to-string'
import { EpisodeView } from './episode-view.js'
import { tc } from '#client/lib/typed-component.js'

/**
 * @param {string | null | undefined} providerUrl
 * @param {string} [providerName]
 */
function renderEmbed (providerUrl, providerName = '') {
  /** @type {TypeEpisodeReadClient} */
  const episode = {
    updated_at: '2026-10-01T00:00:00.000Z',
    bookmark: {},
    oembed: {
      provider_url: providerUrl ?? null,
      provider_name: providerName,
      html: '<iframe src="https://example.com/embed"></iframe>',
    },
  }
  return render(tc(EpisodeView, { episode }))
}

for (const [domain, provider] of /** @type {const} */ ([
  ['soundcloud.com', 'soundcloud'],
  ['twitter.com', 'twitter'],
  ['x.com', 'twitter'],
  ['bsky.app', 'bluesky'],
])) {
  test(`episode embeds recognize ${domain} by hostname`, () => {
    for (const url of [
      `https://${domain}/`,
      `http://${domain}/`,
      `https://www.${domain}/`,
      `https://player.${domain}:8443/embed`,
      `HTTPS://${domain.toUpperCase()}/`,
    ]) {
      assert.ok(renderEmbed(url).includes(`class="bc-episode-embed bc-episode-embed--${provider}"`), url)
    }
  })

  test(`episode embeds reject misleading ${domain} URLs`, () => {
    for (const url of [
      `https://${domain}.example.com/`,
      `https://not${domain}/`,
      `https://${domain}@example.com/`,
      `https://example.com/${domain}`,
      `https://example.com/?provider=${domain}`,
      `https://example.com/#${domain}`,
      `https://example.com/?redirect=https://${domain}/`,
      `ftp://${domain}/`,
      `javascript:https://${domain}/`,
      `//${domain}/`,
    ]) {
      assert.ok(renderEmbed(url).includes('class="bc-episode-embed"'), url)
    }
  })
}

test('episode embeds handle absent and malformed provider URLs', () => {
  for (const url of [undefined, null, '', 'not a URL', 'https://']) {
    assert.ok(renderEmbed(url).includes('class="bc-episode-embed"'), String(url))
  }
})

test('episode embeds preserve case-insensitive provider name hints', () => {
  for (const [name, provider] of /** @type {const} */ ([
    ['SoundCloud', 'soundcloud'],
    ['Twitter', 'twitter'],
    ['Bluesky', 'bluesky'],
    ['Bluesky Social', 'bluesky'],
  ])) {
    assert.ok(renderEmbed(null, name).includes(`class="bc-episode-embed bc-episode-embed--${provider}"`), name)
  }
})
