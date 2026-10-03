import { test, suite } from 'node:test'
import assert from 'node:assert'
import { getBookmarkCreateTitle, maxBookmarkTitleLength } from './put-bookmarks.js'

suite('bookmark create title derivation', () => {
  test('falls back to the URL when the submitted title is empty', () => {
    const url = 'https://example.com/article'

    assert.strictEqual(getBookmarkCreateTitle('', url), url)
  })

  test('truncates long fallback URLs to the database title limit', () => {
    const longUrl = `https://example.com/${'a'.repeat(300)}`
    const title = getBookmarkCreateTitle(undefined, longUrl)

    assert.strictEqual(Array.from(title).length, maxBookmarkTitleLength)
    assert.strictEqual(title, Array.from(longUrl).slice(0, maxBookmarkTitleLength).join(''))
  })

  test('truncates long submitted titles to the database title limit', () => {
    const longTitle = '🍞'.repeat(300)
    const title = getBookmarkCreateTitle(longTitle, 'https://example.com')

    assert.strictEqual(Array.from(title).length, maxBookmarkTitleLength)
    assert.strictEqual(title, '🍞'.repeat(maxBookmarkTitleLength))
  })
})
