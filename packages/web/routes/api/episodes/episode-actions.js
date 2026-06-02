/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeEpisodeUpdate } from './schemas/schema-episode-update.js'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {object} EpisodeActionResult
 * @property {'ok'} status
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.episodeId
 * @param {TypeEpisodeUpdate} params.episode
 * @returns {Promise<EpisodeActionResult>}
 */
export async function updateEpisode (fastify, { userId, episodeId, episode }) {
  const updates = []

  if (episode.title != null) updates.push(SQL`title = ${episode.title}`)
  if (episode.explicit != null) updates.push(SQL`explicit = ${episode.explicit}`)

  if (updates.length > 0) {
    const query = SQL`
      update episodes
      set ${SQL.glue(updates, ' , ')}
      where id = ${episodeId}
      and owner_id = ${userId};
    `

    await fastify.pg.query(query)
  }

  fastify.otel.episodeEditCounter.add(1)

  return {
    status: 'ok',
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.episodeId
 * @returns {Promise<EpisodeActionResult>}
 */
export async function deleteEpisodeById (fastify, { userId, episodeId }) {
  const query = SQL`
    delete from episodes
    where id = ${episodeId}
      and owner_id = ${userId}
  `

  await fastify.pg.query(query)
  fastify.otel.episodeDeleteCounter.add(1)

  return {
    status: 'ok',
  }
}
