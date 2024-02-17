import SQL from '@nearform/sql'

export function getUserQuery ({
  userId
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
