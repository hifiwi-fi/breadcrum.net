import SQL from '@nearform/sql'

/**
 * Constructs a SQL query to fetch details of all user types for administrative purposes.
 *
 * @param {Object} options - Options for the query.
 * @param {number} [options.userId] - The unique identifier of the user to filter by. Optional.
 * @param {string} [options.username] - The username of the user to filter by. Optional.
 * @param {Date|string} [options.before] - Filters users created before this date. Optional.
 * @param {Date|string} [options.after] - Filters users created after this date. Optional.
 * @param {number} [options.perPage] - The number of users to fetch per page. If not provided, fetches all users. Optional.
 * @returns {Object} The SQL query tailored for administrative usage to fetch details of users.
 *
 * @example
 * // Fetch all users for admin
 * getAdminUsersQuery({});
 *
 * // Fetch user with userId 5 for admin
 * getAdminUsersQuery({ userId: 5 });
 *
 * // Fetch first 10 users created before '2023-08-21' for admin
 * getAdminUsersQuery({ before: '2023-08-21', perPage: 10 });
 *
 * @note This function is intended for admin-only routes.
 */
export const getAdminUsersQuery = ({
  userId,
  username,
  before,
  after,
  perPage
}) => {
  const usersQuery = SQL`
    with users_page as (
      select
          u.id,
          u.email,
          u.username,
          u.email_confirmed,
          u.created_at,
          u.updated_at,
          u.pending_email_update,
          u.newsletter_subscription,
          u.disabled,
          u.disabled_reason,
          u.internal_note,
          coalesce(bh.disabled, false) as disabled_email
        from users u
        left join email_blackhole bh
        on u.email = bh.email
        where 1=1
        ${userId ? SQL`and u.id = ${userId}` : SQL``}
        ${username ? SQL`and u.username = ${username}` : SQL``}
        ${before ? SQL`and u.created_at < ${before}` : SQL``}
        ${after ? SQL`and u.created_at >= ${after}` : SQL``}
        order by ${after
          ? SQL`u.created_at asc, u.username asc`
          : SQL`u.created_at desc, u.username desc`
        }
        ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
    )
    select *
    from users_page u
    order by u.created_at desc, u.username desc
  `

  return usersQuery
}
