/**
 * @import { FastifyInstance } from 'fastify'
 */

import SQL from '@nearform/sql'
import { defaultFrontendFlags } from '../../../../plugins/flags/frontend-flags.js'
import { defaultBackendFlags } from '../../../../plugins/flags/backend-flags.js'

/**
 * @typedef {'boolean' | 'string'} FlagType
 * @typedef {{ type: 'boolean', default: boolean, description: string }} BooleanFlagMeta
 * @typedef {{ type: 'string', default: string, description: string }} StringFlagMeta
 * @typedef {BooleanFlagMeta | StringFlagMeta} FlagMeta
 * @typedef {Record<string, FlagMeta>} FlagDefinitions
 * @typedef {Record<string, boolean | string>} FlagValues
 */

export const defaultAdminFlags = /** @type {FlagDefinitions} */ ({
  ...defaultFrontendFlags,
  ...defaultBackendFlags,
})

/**
 * @param {FastifyInstance} fastify
 * @returns {Promise<FlagValues>}
 */
export async function getAdminFlagValues (fastify) {
  return /** @type {FlagValues} */ (await fastify.getFlags({ frontend: true, backend: true }))
}

/**
 * @param {FastifyInstance} fastify
 * @param {Record<string, unknown>} requestFlags
 * @returns {Promise<{ updateCount: number, deleteCount: number }>}
 */
export async function updateAdminFlagValues (fastify, requestFlags) {
  return fastify.pg.transact(async client => {
    const updateFlags = []
    const deleteFlags = []

    for (const [flag, flagMeta] of Object.entries(defaultAdminFlags)) {
      const value = flagValue(requestFlags[flag], flagMeta)
      if (value !== flagMeta.default) {
        updateFlags.push({ flag, value })
      } else {
        deleteFlags.push(flag)
      }
    }

    const returnStats = {
      updateCount: 0,
      deleteCount: 0,
    }

    if (updateFlags.length > 0) {
      const flagUpdateQuery = SQL`
        insert into feature_flags (name, value)
        values ${SQL.glue(
          updateFlags.map(({ flag, value }) => SQL`(${flag}, ${JSON.stringify(value)})`),
          ', '
        )}
        on conflict (name)
        do update
          set value = excluded.value
        returning name, value;
      `

      const flagUpdateResults = await client.query(flagUpdateQuery)
      returnStats.updateCount = flagUpdateResults.rows.length
    }

    if (deleteFlags.length > 0) {
      const flagCleanupQuery = SQL`
        delete from feature_flags
        where name not in (${SQL.glue(Object.keys(defaultAdminFlags).map(flag => SQL`${flag}`), ', ')})
        or name in (${SQL.glue(deleteFlags.map(flag => SQL`${flag}`), ', ')});
      `

      const flagCleanupResults = await client.query(flagCleanupQuery)
      returnStats.deleteCount = flagCleanupResults.rowCount ?? 0
    }

    return returnStats
  })
}

/**
 * @param {unknown} value
 * @param {FlagMeta} flagMeta
 * @returns {boolean | string}
 */
function flagValue (value, flagMeta) {
  const fieldValue = Array.isArray(value) ? value.at(-1) : value
  if (flagMeta.type === 'boolean') {
    return fieldValue === true || fieldValue === 'true' || fieldValue === 'on' || fieldValue === '1'
  }

  return typeof fieldValue === 'string' ? fieldValue : flagMeta.default
}
