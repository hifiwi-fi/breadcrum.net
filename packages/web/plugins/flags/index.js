import fp from 'fastify-plugin'
import SQL from '@nearform/sql'
import { defaultFrontendFlags } from './frontend-flags.js'
import { defaultBackendFlags } from './backend-flags.js'

/**
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */

/**
 * This plugins adds a flags system available to all routes
 */
export default fp(async function (fastify, _) {
  fastify.decorate('getFlags',
    /**
     * Retrieves the feature flags.
     *
     * @param {Object} options - The options for retrieving flags.
     * @param {PgClient} [options.pgClient] - The PostgreSQL client instance.
     * @param {boolean} [options.frontend=true] - Whether to retrieve frontend flags.
     * @param {boolean} [options.backend=true] - Whether to retrieve backend flags.
     * @returns {Promise<Object>} The retrieved flag set.
     */
    async function ({
      pgClient,
      frontend = true,
      backend = true,
    }) {
      const flagsQuery = SQL`
        select
          ff.name,
          ff.value
        from feature_flags ff
        order by ff.name
      `

      const client = pgClient ?? fastify.pg

      const flagsResults = await client.query(flagsQuery)
      const actualFlagSet = {}

      const flagset = {
        ...(frontend ? defaultFrontendFlags : {}),
        ...(backend ? defaultBackendFlags : {}),
      }

      for (const [flag, flagProps] of Object.entries(flagset)) {
        actualFlagSet[flag] = flagsResults.rows.find(
          flagRow => flagRow.name === flag
        )?.value ??
          flagProps.default
      }
      return actualFlagSet
    }
  )
}, {
  name: 'flags',
  dependencies: ['pg'],
})
