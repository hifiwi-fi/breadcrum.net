/// <reference lib="dom" />

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { QueryClient } from '@tanstack/query-core'
import { getBookmarksCollection } from './bookmarks-collection.js'
import { getFeedsCollection } from './feeds-collection.js'
import { clearOfflineRuntimeCache, queryKeyHasOfflineRuntimeNamespace } from './offline-cleanup.js'
import { getOfflineScope } from './offline-db.js'

suite('offline runtime cleanup', () => {
  test('detects namespaced offline query keys', () => {
    const scope = getOfflineScope({ apiUrl: '/api', userId: 'user-1' })

    assert.equal(
      queryKeyHasOfflineRuntimeNamespace(['offline-bookmarks', scope.runtimeNamespace], scope.runtimeNamespace),
      true
    )
    assert.equal(
      queryKeyHasOfflineRuntimeNamespace(['bookmarks', 'user-1', '/api'], scope.runtimeNamespace),
      false
    )
  })

  test('removes only offline queries for the requested runtime namespace', () => {
    const queryClient = new QueryClient()
    const scope = getOfflineScope({ apiUrl: '/api', userId: 'user-1' })
    const otherScope = getOfflineScope({ apiUrl: '/api', userId: 'user-2' })
    const queryKey = ['offline-bookmarks', scope.runtimeNamespace, false]
    const otherQueryKey = ['offline-bookmarks', otherScope.runtimeNamespace, false]
    const normalQueryKey = ['bookmarks', 'user-1', '/api']

    queryClient.setQueryData(queryKey, [])
    queryClient.setQueryData(otherQueryKey, [])
    queryClient.setQueryData(normalQueryKey, [])

    const result = clearOfflineRuntimeCache({
      apiUrl: '/api',
      userId: 'user-1',
      queryClient,
    })

    assert.equal(result.runtimeNamespace, scope.runtimeNamespace)
    assert.equal(result.queryEntries, 1)
    assert.equal(queryClient.getQueryData(queryKey), undefined)
    assert.deepEqual(queryClient.getQueryData(otherQueryKey), [])
    assert.deepEqual(queryClient.getQueryData(normalQueryKey), [])
  })

  test('clears memoized offline collections for the requested runtime namespace', () => {
    const options = {
      apiUrl: '/api',
      userId: 'user-1',
      sensitive: false,
      toread: false,
      starred: false,
    }
    const otherOptions = {
      ...options,
      userId: 'user-2',
    }
    const collection = getBookmarksCollection(options)
    const sameCollection = getBookmarksCollection(options)
    const otherCollection = getBookmarksCollection(otherOptions)
    const feedCollection = getFeedsCollection(options)
    const sameFeedCollection = getFeedsCollection(options)
    const otherFeedCollection = getFeedsCollection(otherOptions)

    assert.equal(collection, sameCollection)
    assert.equal(feedCollection, sameFeedCollection)

    const result = clearOfflineRuntimeCache({
      apiUrl: options.apiUrl,
      userId: options.userId,
      queryClient: new QueryClient(),
    })
    const recreatedCollection = getBookmarksCollection(options)
    const recreatedFeedCollection = getFeedsCollection(options)

    assert.equal(result.bookmarkCollections, 1)
    assert.equal(result.feedCollections, 1)
    assert.notEqual(recreatedCollection, collection)
    assert.notEqual(recreatedFeedCollection, feedCollection)
    assert.equal(getBookmarksCollection(otherOptions), otherCollection)
    assert.equal(getFeedsCollection(otherOptions), otherFeedCollection)
  })
})
