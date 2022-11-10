import SQL from '@nearform/sql'

export function getUserQuery ({
  userId
}) {
  const query = SQL`
    select id, email, username, email_confirmed, created_at, updated_at, pending_email_update
    from users
    where id = ${userId}`

  return query
}
