/// <reference lib="dom" />

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { refetchOfflineTarget } from './useOfflineReadSync.js'

suite('offline read sync helpers', () => {
  test('refetches offline target without throwing on error', async () => {
    /** @type {{ throwOnError?: boolean } | undefined} */
    let receivedOptions
    const result = await refetchOfflineTarget({
      utils: {
        refetch: async (options) => {
          receivedOptions = options
          return []
        },
      },
    })

    assert.deepEqual(receivedOptions, { throwOnError: false })
    assert.deepEqual(result, [])
  })
})
