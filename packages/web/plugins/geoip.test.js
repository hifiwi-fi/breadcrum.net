import { test, suite } from 'node:test'
import assert from 'node:assert'
import { countryIsoToFlagEmoji } from './geoip.js'

await suite('GeoIP helpers', async () => {
  await test('maps ISO codes to emoji flags', () => {
    /** @type {Array<[string, string]>} */
    const cases = [
      ['US', '🇺🇸'],
      ['CA', '🇨🇦'],
      ['GB', '🇬🇧'],
      ['br', '🇧🇷'],
    ]

    for (const [iso, expected] of cases) {
      assert.strictEqual(countryIsoToFlagEmoji(iso), expected)
    }
  })

  await test('returns null for invalid ISO codes', () => {
    /** @type {Array<string | null>} */
    const cases = [
      null,
      '',
      'USA',
      '1A',
      'U',
    ]

    for (const value of cases) {
      assert.strictEqual(countryIsoToFlagEmoji(value), null)
    }
  })
})
