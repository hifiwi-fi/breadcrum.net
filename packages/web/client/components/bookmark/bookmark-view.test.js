/// <reference lib="dom" />

/**
 * @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { html } from 'htm/preact'
import { render } from 'preact-render-to-string'
import { BookmarkView } from './bookmark-view.js'

/** @type {TypeBookmarkReadClient} */
const bookmark = {
  id: '00000000-0000-4000-8000-000000000001',
  url: 'https://example.com/article',
  original_url: null,
  title: 'Example article',
  note: '',
  summary: '',
  starred: false,
  toread: true,
  sensitive: false,
  archive_urls: [],
  tags: [],
  archives: [],
  episodes: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  done: true,
}

suite('BookmarkView', () => {
  test('disables write controls when writeDisabled is true', () => {
    const rendered = render(html`<${BookmarkView} bookmark=${bookmark} writeDisabled=${true} />`)

    assert.ok(rendered.includes('aria-disabled="true"'))
    assert.ok(rendered.includes('<button disabled'))
  })
})
