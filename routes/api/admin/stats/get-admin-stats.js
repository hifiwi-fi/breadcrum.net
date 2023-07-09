import SQL from '@nearform/sql'

export async function getAdminStats (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin
      ], {
        relation: 'and'
      }),
      schema: {
        hide: true
      }
    },
    // Get admin flags
    async function getAdminFlagsHandler (request, reply) {
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

      const recentUsersQuery = SQL`
        select u.id, u.username, u.email
        from users u
        where u.created_at >= NOW() - INTERVAL '3 month'
        order by created_at desc;
      `

      const recentUsersResults = await fastify.pg.query(recentUsersQuery)

      return {
        totalUsers: totalUsersQueryResults.rows,
        totalBookmarks: totalCountResults.rows,
        recentUsers: recentUsersResults.rows,
        bookmarkStats: monthBookmarkCountResults.rows
      }
    }
  )
}
