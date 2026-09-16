import { test, suite } from 'node:test'
import assert from 'node:assert'
import { countryIsoToFlagEmoji, withGeoipStartupTimeout } from './geoip.js'

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

  await test('returns resolved startup work before the timeout', async () => {
    /** @type {AbortSignal[]} */
    const signals = []

    const value = await withGeoipStartupTimeout((signal) => {
      signals.push(signal)
      return Promise.resolve('ready')
    }, 100)

    assert.strictEqual(value, 'ready')
    assert.ok(signals[0] instanceof AbortSignal)
  })

  await test('rejects startup work after the timeout', async () => {
    await assert.rejects(
      withGeoipStartupTimeout(() => new Promise(() => {}), 10),
      /GeoIP database update timed out after 10ms/
    )
  })
})
