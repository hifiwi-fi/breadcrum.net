import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  getGlobalDispatcher,
  MockAgent,
  setGlobalDispatcher,
} from 'undici'
import {
  getYTDLPDiscoveryMetadata,
  getYTDLPMetadata,
  isRetryableYTDLPStatus,
  YTDLPAPIError,
} from './yt-dlp-api-client.js'

const originalDispatcher = getGlobalDispatcher()

afterEach(() => {
  setGlobalDispatcher(originalDispatcher)
})

/**
 * @returns {{ mockAgent: MockAgent, endpoint: string }}
 */
function setupMockYTDLPAPI () {
  const mockAgent = new MockAgent()
  mockAgent.disableNetConnect()
  setGlobalDispatcher(mockAgent)

  return {
    mockAgent,
    endpoint: 'https://user:pass@ytdlp.example.test',
  }
}

test('YTDLPAPIError classifies 5xx unified failures as retryable', async () => {
  const { mockAgent, endpoint } = setupMockYTDLPAPI()
  const pool = mockAgent.get('https://ytdlp.example.test')

  pool.intercept({
    method: 'GET',
    path: '/unified?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc123&format=video',
  }).reply(500, {
    code: 500,
    name: 'Internal Server Error',
    description: 'Error extracting data from YouTube',
  })

  await assert.rejects(
    getYTDLPMetadata({
      url: 'https://www.youtube.com/watch?v=abc123',
      medium: 'video',
      ytDLPEndpoint: endpoint,
      cache: undefined,
      maxRetries: 0,
    }),
    (err) => {
      assert.ok(err instanceof YTDLPAPIError)
      assert.equal(err.statusCode, 500)
      assert.equal(err.description, 'Error extracting data from YouTube')
      assert.equal(err.endpointType, 'unified')
      assert.equal(err.retryable, true)
      assert.equal(err.permanent, false)
      return true
    }
  )
})

test('YTDLPAPIError classifies 4xx unified failures as permanent', async () => {
  const { mockAgent, endpoint } = setupMockYTDLPAPI()
  const pool = mockAgent.get('https://ytdlp.example.test')

  pool.intercept({
    method: 'GET',
    path: '/unified?url=https%3A%2F%2Fexample.com%2Fvideo&format=audio',
  }).reply(404, {
    description: 'No matching formats found',
  })

  await assert.rejects(
    getYTDLPMetadata({
      url: 'https://example.com/video',
      medium: 'audio',
      ytDLPEndpoint: endpoint,
      cache: undefined,
    }),
    (err) => {
      assert.ok(err instanceof YTDLPAPIError)
      assert.equal(err.statusCode, 404)
      assert.equal(err.description, 'No matching formats found')
      assert.equal(err.endpointType, 'unified')
      assert.equal(err.retryable, false)
      assert.equal(err.permanent, true)
      return true
    }
  )
})

test('YTDLPAPIError preserves discover endpoint failures', async () => {
  const { mockAgent, endpoint } = setupMockYTDLPAPI()
  const pool = mockAgent.get('https://ytdlp.example.test')

  pool.intercept({
    method: 'GET',
    path: '/discover?url=https%3A%2F%2Fexample.com%2Fvideo&format=video',
  }).reply(429, {
    description: 'Rate limited',
  })

  await assert.rejects(
    getYTDLPDiscoveryMetadata({
      url: 'https://example.com/video',
      medium: 'video',
      ytDLPEndpoint: endpoint,
      cache: undefined,
    }),
    (err) => {
      assert.ok(err instanceof YTDLPAPIError)
      assert.equal(err.statusCode, 429)
      assert.equal(err.endpointType, 'discover')
      assert.equal(err.retryable, true)
      assert.equal(err.permanent, false)
      return true
    }
  )
})

test('isRetryableYTDLPStatus identifies temporary statuses', () => {
  assert.equal(isRetryableYTDLPStatus(408), true)
  assert.equal(isRetryableYTDLPStatus(429), true)
  assert.equal(isRetryableYTDLPStatus(500), true)
  assert.equal(isRetryableYTDLPStatus(404), false)
})
