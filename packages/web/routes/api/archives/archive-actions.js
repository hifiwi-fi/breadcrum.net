/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeArchiveUpdate } from './schemas/schema-archive-update.js'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {object} ArchiveActionResult
 * @property {'ok'} status
 */

/**
 * @typedef {object} ArchiveDeleteResult
 * @property {boolean} ok
 * @property {number} statusCode
 * @property {string} message
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.archiveId
 * @param {TypeArchiveUpdate} params.archive
 * @returns {Promise<ArchiveActionResult>}
 */
export async function updateArchive (fastify, { userId, archiveId, archive }) {
  const updates = []

  if (archive.title != null) updates.push(SQL`title = ${archive.title}`)

  if (updates.length > 0) {
    const query = SQL`
      update archives
      set ${SQL.glue(updates, ' , ')}
      where id = ${archiveId}
      and owner_id = ${userId};
    `

    await fastify.pg.query(query)
  }

  fastify.otel.archiveEditCounter.add(1)

  return {
    status: 'ok',
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.archiveId
 * @returns {Promise<ArchiveDeleteResult>}
 */
export async function deleteArchiveById (fastify, { userId, archiveId }) {
  const query = SQL`
    delete from archives
    where id = ${archiveId}
      and owner_id = ${userId}
  `

  const result = await fastify.pg.query(query)

  if (result.rowCount === 0) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Archive not found or you do not have permission to delete it',
    }
  }

  fastify.otel.archiveDeleteCounter.add(1)

  return {
    ok: true,
    statusCode: 202,
    message: 'ok',
  }
}
