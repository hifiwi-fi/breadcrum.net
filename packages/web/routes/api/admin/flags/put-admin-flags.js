import SQL from '@nearform/sql'
import { defaultFrontendFlags } from '../../../../plugins/flags/frontend-flags.js'
import { defaultBackendFlags } from '../../../../plugins/flags/backend-flags.js'

const defaultFlags = {
  ...defaultFrontendFlags,
  ...defaultBackendFlags,
}

export async function putAdminFlags (fastify, opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        body: {
          type: 'object',
          properties: defaultFlags,
          additionalProperties: false,
          minProperties: 1,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              updateCount: {
                type: 'integer',
              },
              deleteCount: {
                type: 'integer',
              },
            },
          },
        },
      },
    },
    // Get flags
    async function putAdminFlagsHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const requestFlags = request.body
        const updateFlags = []
        const deleteFlags = []

        for (const [flag, flagMeta] of Object.entries(defaultFlags)) {
          if (requestFlags[flag] !== flagMeta.default) {
            const value = requestFlags[flag]
            updateFlags.push({
              flag,
              value,
            })
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
              set name = excluded.name
            returning name, value;
          `

          const flagUpdateResults = await client.query(flagUpdateQuery)

          returnStats.updateCount = flagUpdateResults.rows.length
        }

        if (deleteFlags.length > 0) {
          const flagCleanupQuery = SQL`
            delete from feature_flags
            where name not in (${SQL.glue(Object.keys(defaultFlags).map(flag => SQL`${flag}`), ', ')})
            or name in (${SQL.glue(deleteFlags.map(flag => SQL`${flag}`), ', ')});
          `

          const flagCleanupResults = await client.query(flagCleanupQuery)

          returnStats.deleteCount = flagCleanupResults.rows.length
        }

        return returnStats
      })
    }
  )
}
