/**
 * @import { SchemaBookmarkCreate } from './schemas/schema-bookmark-create.js'
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkRead } from './schemas/schema-bookmark-read.js'
 * @import { PoolClient } from 'pg'
 */
import { oneLineTrim } from 'common-tags'
import { getBookmark } from './get-bookmarks-query.js'
import { createBookmark } from './put-bookmark-query.js'
import { normalizeURL } from '#resources/bookmarks/normalize-url.js'
import { syncReceiptHeaders, withSyncReceipt } from '#resources/sync/sync-receipt.js'
import { bookmarkSyncReceipt } from './schemas/bookmark-sync.js'
import { bookmarkReceipt } from './sync-receipt.js'

export const maxBookmarkTitleLength = 255

/**
 * Derive a bookmark title that satisfies the database title length constraint.
 *
 * @param {string | undefined} submittedTitle
 * @param {string} fallbackTitle
 * @returns {string}
 */
export function getBookmarkCreateTitle (submittedTitle, fallbackTitle) {
  const title = submittedTitle || fallbackTitle
  return Array.from(title).slice(0, maxBookmarkTitleLength).join('')
}

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     references: [ SchemaBookmarkRead ],
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 */
export async function putBookmarks (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled,
      ], {
        relation: 'and',
      }),
      schema: ({
        tags: ['bookmarks'],
        description: 'Create or find a bookmark.',
        headers: syncReceiptHeaders,
        body: /** @type {SchemaBookmarkCreate} */ (fastify.getSchema('schema:breadcrum:bookmark:create')),
        querystring: {
          type: 'object',
          properties: {
            update: {
              type: 'boolean',
              default: false,
              description: oneLineTrim`
              If set to true, bookmarks that already exist at URL are redirected
              to to the specific bookmark endpoint which will process the
              request as a bookmark update. Otherwise, this creates or returns
              the existing bookmark.
            `,
            },
            meta: {
              type: 'boolean',
              default: true,
              description: 'Extract page metadata on the server. User provided fields take precedence.',
            },
            episode: {
              type: 'boolean',
              default: true,
              description: 'Determines if an episode is optimistically created',
            },
            archive: {
              type: 'boolean',
              default: true,
              description: 'Determines if an archive is optimistically created',
            },
            normalize: {
              type: 'boolean',
              default: true,
              description: 'Normalize URLs when looking them up or creating them.',
            },
            exact_url: {
              type: 'boolean',
              default: false,
              description: 'Skip normalization and use the submitted URL as-is.',
            },
          }
        },
        response: {
          409: { $ref: 'HttpError' },
          201: {
            type: 'object',
            description: 'Newly created bookmarks are returned in full',
            properties: {
              status: { enum: ['created'] },
              site_url: { type: 'string' },
              data: {
                $ref: 'schema:breadcrum:bookmark:read',
              },
            },
          },
          200: {
            type: 'object',
            description: 'Returns the existing bookmark or a sync receipt.',
            properties: {
              sync: bookmarkSyncReceipt,
              status: { enum: ['nochange'] },
              site_url: { type: 'string' },
              data: {
                $ref: 'schema:breadcrum:bookmark:read',
              },
            },
          },
        },
      }),
    },
    async function createBookmarkHandler (request, reply) {
      const userId = request.user.id
      const operationId = request.headers['idempotency-key']
      const { update, meta, episode, archive, normalize, exact_url: exactUrl } = request.query

      /** @param {PoolClient} client */
      async function storeBookmark (client) {
        const {
          url: submittedUrlString, title: submittedTitle, note, toread, sensitive,
          starred, tags = [], archive_urls: archiveUrls = [], summary,
        } = request.body
        const shouldNormalize = exactUrl ? false : normalize
        let submittedUrl
        try {
          submittedUrl = new URL(submittedUrlString)
        } catch {
          throw fastify.httpErrors.badRequest('Invalid URL format')
        }

        const workingUrl = shouldNormalize
          ? await normalizeURL(submittedUrl, { cache: fastify.cache, logger: request.log })
          : submittedUrl
        const url = shouldNormalize ? workingUrl.toString() : submittedUrlString
        const lookup = { fastify, pg: client, ownerId: userId, url, sensitive: true, perPage: 1 }
        const existing = await getBookmark(lookup)
        if (existing) return /** @type {const} */ ({ created: false, bookmark: existing })

        const bookmark = await createBookmark({
          fastify,
          pg: client,
          url,
          title: getBookmarkCreateTitle(submittedTitle, url),
          note,
          toread,
          sensitive,
          starred: operationId ? starred : undefined,
          archiveUrls,
          summary,
          userId,
          originalUrl: shouldNormalize && url !== submittedUrlString ? submittedUrlString : null,
          meta,
          tags,
          keepExisting: Boolean(operationId),
        })
        if (!bookmark) {
          const winner = await getBookmark(lookup)
          if (!winner) throw fastify.httpErrors.serviceUnavailable('The bookmark changed during creation. Retry this request.')
          return /** @type {const} */ ({ created: false, bookmark: winner })
        }

        // Legacy writes become visible before submitting their background job.
        if (!operationId) {
          await client.query('commit')
          fastify.otel.bookmarkCreatedCounter.add(1)
        }
        if (meta || episode || archive) {
          const jobId = await fastify.pgboss.queues.resolveBookmarkQ.send({
            data: {
              userId,
              url,
              bookmarkId: bookmark.id,
              resolveBookmark: meta,
              resolveEpisode: episode,
              resolveArchive: archive,
              parentRequestId: request.id,
              userProvidedMeta: { title: submittedTitle, tags, summary },
            },
            // Receipt, bookmark, and queue insert commit together for a sync create.
            ...(operationId ? { options: { db: { executeSql: (sql, values) => client.query(sql, values) } } } : {}),
          })
          if (operationId && !jobId) throw fastify.httpErrors.serviceUnavailable('Could not enqueue bookmark resolution.')
        }
        return /** @type {const} */ ({ created: true, bookmark })
      }

      if (operationId) {
        reply.header('Cache-Control', 'private, no-store')
        if (update) return reply.badRequest('Sync creates do not support the update redirect.')
        let created = false
        const sync = await fastify.pg.transact(client => withSyncReceipt(
          client, fastify.httpErrors, userId, operationId, ['create', request.body, request.query], async id => {
            const result = await storeBookmark(client)
            created = result.created
            return bookmarkReceipt(id, result.bookmark.id, created ? 'created' : 'existing')
          }
        ))
        if (created) fastify.otel.bookmarkCreatedCounter.add(1)
        return reply.code(200).send({ sync })
      }

      return fastify.pg.transact(async client => {
        const result = await storeBookmark(client)
        const bookmarkId = result.bookmark.id
        const siteUrl = `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${bookmarkId}`
        if (!result.created) {
          if (update) return reply.redirect(`/api/bookmarks/${bookmarkId}`, 308)
          return reply.code(200).send({ status: 'nochange', site_url: siteUrl, data: result.bookmark })
        }

        const bookmark = await getBookmark({ fastify, ownerId: userId, bookmarkId, sensitive: true, perPage: 1 })
        if (!bookmark) throw new Error('Bookmark was not created')
        return reply.code(201).send({ status: 'created', site_url: siteUrl, data: bookmark })
      })
    }
  )
}
