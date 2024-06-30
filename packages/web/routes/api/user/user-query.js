import SQL from '@nearform/sql'

/**
 * Constructs a SQL query to retrieve detailed information about a specific user by their ID.
 *
 * This function generates a SQL query that selects various user attributes from the `users` table,
 * including the user's ID, email, username, email confirmation status, creation and update timestamps,
 * pending email update status, newsletter subscription status, admin status, disabled status, and the
 * reason for being disabled. Additionally, it checks if the user's email is in the `email_blackhole`
 * table, indicating whether the email is disabled, and coalesces the result to `false` if not present.
 *
 * The query uses a left join to combine data from the `users` table with the `email_blackhole` table
 * based on the user's email address. This allows the query to determine if the user's email has been
 * marked as disabled due to being in the blackhole list.
 *
 * @param {Object} params - The parameters for generating the query.
 * @param {number} params.userId - The unique identifier of the user to retrieve information for.
 * @returns {SQL.SqlStatement} The SQL query statement ready to be executed, constructed using the `@nearform/sql` library to safely include parameters.
 */
export function getUserQuery ({
  userId,
}) {
  const query = SQL`
    select
      u.id,
      u.email,
      u.username,
      u.email_confirmed,
      u.created_at,
      u.updated_at,
      u.pending_email_update,
      u.newsletter_subscription,
      u.admin,
      u.disabled,
      u.disabled_reason,
      coalesce(bh.disabled, false) as disabled_email
    from users u
    left join email_blackhole bh
    on u.email = bh.email
    where u.id = ${userId}`

  return query
}
