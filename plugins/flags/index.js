import fp from 'fastify-plugin'
import SQL from '@nearform/sql'
import { defaultFrontendFlags } from './frontend-flags.js'
import { defaultBackendFlags } from './backend-flags.js'

/**
 * This plugins adds a flags system avaialble to all routes
 *
 */
export default fp(async function (fastify, opts) {
  fastify.decorate('getFlags', async function ({
    pgClient,
    frontend = true, // get frontend flags
    backend = true // get backend flags
  }) {
    // TODO: enable cache
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
      ...(backend ? defaultBackendFlags : {})
    }

    for (const [flag, flagProps] of Object.entries(flagset)) {
      actualFlagSet[flag] = flagsResults.rows.find(
        flagRow => flagRow.name === flag
      )?.value ??
        flagProps.default
    }
    return actualFlagSet
  })
}, {
  name: 'flags',
  dependencies: ['pg']
})
