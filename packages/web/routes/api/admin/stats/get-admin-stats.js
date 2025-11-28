import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function getAdminStats (fastify, _opts) {
  fastify.get(
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
      },
    },
    // Get admin flags
    async function getAdminFlagsHandler (_request, _reply) {
      const monthBookmarkCountQuery = SQL`
        select u.id, u.username, u.email, count(*) as bookmark_count
        from users u
        left join bookmarks b
        on u.id = b.owner_id
        where b.created_at >= NOW() - INTERVAL '1 month'
        group by u.id, u.username, u.email
        order by bookmark_count desc;
      `

      const monthBookmarkCountResults = await fastify.pg.query(monthBookmarkCountQuery)

      const totalCountQuery = SQL`
        select count(*) as bookmark_count
        from bookmarks b;
      `

      const totalCountResults = await fastify.pg.query(totalCountQuery)

      const totalUsersQuery = SQL`
        select count(*) as users_count
        from users b;
      `

      const totalUsersQueryResults = await fastify.pg.query(totalUsersQuery)

      return {
        bookmarkStats: monthBookmarkCountResults.rows,
        totalUsers: totalUsersQueryResults.rows,
        totalBookmarks: totalCountResults.rows,
      }
    }
  )
}
