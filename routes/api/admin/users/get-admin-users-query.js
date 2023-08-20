import SQL from '@nearform/sql'

export const getAdminUsersQuery = ({
  userId,
  username,
  before,
  perPage
}) => {
  const usersQuery = SQL`
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
        order by u.created_at desc, u.username desc
        ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
      `

  return usersQuery
}

// For doing offset pagination, this converts after queries to a before query
export const afterToBeforeAdminUsersQuery = ({
  perPage,
  after
}) => {
  const perPageAfterOffset = perPage + 2
  const afterCalcUsersQuery = SQL`
          with page as (
            select u.id, u.created_at
            from users u
            where u.created_at >= ${after}
            order by u.created_at asc, u.username asc
            fetch first ${perPageAfterOffset} rows only
          ),
          users_with_last_row_date as (
            select last_value(page.created_at) over (
                  order by page.created_at
                  range between
                      UNBOUNDED PRECEDING AND
                      UNBOUNDED FOLLOWING
              ) last_created_at
            from page
          )
          select count(*)::int as user_count, last_created_at
          from users_with_last_row_date
          group by last_created_at`

  return afterCalcUsersQuery
}
