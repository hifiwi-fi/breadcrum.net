import { readSyncState, readBootstrapPage, readChangesPage } from './sync-read.js'
import { readCursor, signCursor, SyncCursorError } from './sync-cursor.js'
import { bootstrapQuery, changesQuery, bootstrapSchema, changesSchema, cursorErrorSchema } from './sync-schemas.js'

/** @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts' */

/** @type {FastifyPluginAsyncJsonSchemaToTs} */
export default async function deltaRoutes (fastify) {
  fastify.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'private, no-store')
    reply.header('Breadcrum-Sync-Writes', 'bookmark-edit, archive-capture, archive-delete')
  })
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof SyncCursorError) {
      return reply.code(error.statusCode).send({ code: error.code, message: error.message })
    }
    throw error
  })

  const preHandler = fastify.auth([fastify.verifyJWT])

  fastify.get('/bootstrap', {
    preHandler,
    schema: {
      tags: ['sync'],
      description: '**Alpha (unstable).** This contract may change without notice. Returns a page of the account’s bookmark library and a cursor for catching up on changes.',
      querystring: bootstrapQuery,
      response: { 200: bootstrapSchema, 400: cursorErrorSchema, 410: cursorErrorSchema },
    },
  }, async function bootstrap (request, reply) {
    const { page_token: token, per_page: pageSize } = request.query
    const result = await fastify.pg.transact(async client => {
      await client.query('set transaction isolation level repeatable read read only')
      const { owner, revision, key } = await readSyncState(client, request.user.id)
      const prior = token ? await readCursor(client, key, owner, token) : null
      if (prior && prior.kind !== 'bootstrap') throw new SyncCursorError(400)
      const start = prior?.start ?? revision
      if (BigInt(start) > BigInt(revision)) throw new SyncCursorError(410)
      const { bookmarks, nextId } = await readBootstrapPage(client, owner.ownerId, prior?.after ?? null, pageSize)
      return {
        bookmarks,
        cursor: signCursor(key, owner, { kind: 'changes', after: start, bound: null }),
        next_page_token: nextId ? signCursor(key, owner, { kind: 'bootstrap', start, after: nextId }) : null,
      }
    })
    return reply.code(200).send(result)
  })

  fastify.get('/changes', {
    preHandler,
    schema: {
      tags: ['sync'],
      description: '**Alpha (unstable).** This contract may change without notice. Returns bookmark upserts and hard deletes after the supplied cursor.',
      querystring: changesQuery,
      response: { 200: changesSchema, 400: cursorErrorSchema, 410: cursorErrorSchema },
    },
  }, async function changes (request, reply) {
    const { cursor, per_page: pageSize } = request.query
    const result = await fastify.pg.transact(async client => {
      await client.query('set transaction isolation level repeatable read read only')
      const { owner, revision, key } = await readSyncState(client, request.user.id)
      const prior = await readCursor(client, key, owner, cursor)
      if (prior.kind !== 'changes') throw new SyncCursorError(400)
      const bound = prior.bound ?? revision
      if (BigInt(prior.after) > BigInt(bound) || BigInt(bound) > BigInt(revision)) throw new SyncCursorError(410)
      const page = await readChangesPage(client, owner.ownerId, prior.after, bound, pageSize)
      return {
        changes: page.changes,
        next_cursor: signCursor(key, owner, { kind: 'changes', after: page.after, bound: page.hasMore ? bound : null }),
        has_more: page.hasMore,
      }
    })
    return reply.code(200).send(result)
  })
}
