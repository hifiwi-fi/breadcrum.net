/// <reference lib="dom" />

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getOfflineCollectionId,
  getOfflineDatabaseName,
  getOfflineScope,
  normalizeOfflineApiUrl,
  normalizeOfflineUserId,
  OFFLINE_STORAGE_PREFIX,
  canUseOfflinePersistence,
} from './offline-db.js'

suite('offline DB identity helpers', () => {
  test('normalizes API URLs and blank user ids', () => {
    assert.equal(normalizeOfflineApiUrl(undefined), '/api')
    assert.equal(normalizeOfflineApiUrl(''), '/api')
    assert.equal(normalizeOfflineApiUrl(' /api/ '), '/api')
    assert.equal(normalizeOfflineApiUrl('https://example.com/api/'), 'https://example.com/api')
    assert.equal(normalizeOfflineUserId(null), null)
    assert.equal(normalizeOfflineUserId(''), null)
    assert.equal(normalizeOfflineUserId(' user-1 '), 'user-1')
  })

  test('keeps logged-out runtime scope separate from private storage scope', () => {
    const scope = getOfflineScope({ apiUrl: ' /api/ ', userId: null })

    assert.equal(scope.apiUrl, '/api')
    assert.equal(scope.userId, null)
    assert.equal(scope.privateNamespace, null)
    assert.equal(scope.runtimeNamespace, `${OFFLINE_STORAGE_PREFIX}:api:%2Fapi:anonymous`)
  })

  test('creates stable user-scoped private namespaces', () => {
    const scope = getOfflineScope({ apiUrl: '/api/', userId: ' user-1 ' })
    const sameScope = getOfflineScope({ apiUrl: '/api', userId: 'user-1' })
    const otherUserScope = getOfflineScope({ apiUrl: '/api', userId: 'user-2' })
    const otherApiScope = getOfflineScope({ apiUrl: '/other-api', userId: 'user-1' })

    assert.equal(scope.privateNamespace, `${OFFLINE_STORAGE_PREFIX}:api:%2Fapi:user:user-1`)
    assert.equal(scope.runtimeNamespace, scope.privateNamespace)
    assert.equal(scope.privateNamespace, sameScope.privateNamespace)
    assert.notEqual(scope.privateNamespace, otherUserScope.privateNamespace)
    assert.notEqual(scope.privateNamespace, otherApiScope.privateNamespace)
  })

  test('encodes separators in namespace parts and collection variants', () => {
    const scope = getOfflineScope({
      apiUrl: 'https://example.com/api',
      userId: 'user:one/two',
    })
    const collectionId = getOfflineCollectionId({
      scope,
      collection: 'bookmarks spike',
      variant: JSON.stringify({ sensitive: true, page: 200 }),
    })

    assert.equal(
      scope.privateNamespace,
      `${OFFLINE_STORAGE_PREFIX}:api:https%3A%2F%2Fexample.com%2Fapi:user:user%3Aone%2Ftwo`
    )
    assert.equal(
      collectionId,
      `${scope.runtimeNamespace}:collection:bookmarks%20spike:variant:%7B%22sensitive%22%3Atrue%2C%22page%22%3A200%7D`
    )
  })

  test('requires collection names', () => {
    const scope = getOfflineScope({ apiUrl: '/api', userId: 'user-1' })

    assert.throws(() => getOfflineCollectionId({ scope, collection: ' ' }), {
      message: 'Offline collection name is required',
    })
  })

  test('uses private namespaces for OPFS database names', () => {
    const anonymousScope = getOfflineScope({ apiUrl: '/api', userId: null })
    const privateScope = getOfflineScope({ apiUrl: '/api', userId: 'user-1' })

    assert.equal(getOfflineDatabaseName(anonymousScope), null)
    assert.equal(
      getOfflineDatabaseName(privateScope),
      `${privateScope.privateNamespace}:sqlite`
    )
  })

  test('detects browser OPFS persistence prerequisites', () => {
    assert.equal(canUseOfflinePersistence({}), false)
    assert.equal(canUseOfflinePersistence({
      navigator: {
        storage: {
          getDirectory: () => Promise.resolve({}),
        },
      },
      Worker: function Worker () {},
    }), true)
  })
})
