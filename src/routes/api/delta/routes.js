import { readSyncState, readBootstrapPage, readChangesPage } from './sync-read.js'
import { readCursor, signCursor, SyncCursorError } from './sync-cursor.js'
import { bootstrapQuery, changesQuery, bootstrapSchema, changesSchema, cursorErrorSchema } from './sync-schemas.js'
import { bookmarkEditSchema, mutationReceiptSchema } from './mutation-schemas.js'
import { syncEdit } from './sync-edit.js'

/** @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts' */

/** @type {FastifyPluginAsyncJsonSchemaToTs} */
export default async function deltaRoutes (fastify) {
  fastify.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'private, no-store')
  })
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof SyncCursorError) {
      return reply.code(error.statusCode).send({ code: error.code, message: error.message })
    }
    throw error
  })

  const preHandler = fastify.auth([fastify.verifyJWT])

  fastify.post('/mutations', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.notDisabled], { relation: 'and' }),
    schema: {
      tags: ['sync'],
      description: '**Alpha (unstable).** Submit a bookmark edit and receive its retained operation receipt. Retry with the same operation ID and intent to recover the original result.',
      body: bookmarkEditSchema,
      response: {
        200: mutationReceiptSchema,
        400: { $ref: 'HttpError' },
        401: { $ref: 'HttpError' },
        409: { $ref: 'HttpError' },
      },
    },
  }, async function mutate (request, reply) {
    const result = await fastify.pg.transact(client => syncEdit(client, request.user.id, request.body))
    switch (result.kind) {
      case 'account_missing': return reply.unauthorized()
      case 'duplicate_tag': return reply.badRequest('Each tag membership may be edited only once per operation.')
      case 'operation_id_reused': return reply.conflict('This operation ID already belongs to a different intent.')
      case 'receipt': return reply.code(200).send(result.receipt)
    }
  })

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
