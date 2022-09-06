import SQL from '@nearform/sql'

export function getUserQuery ({
  userId
}) {
  const query = SQL`
    select id, email, username, email_confirmed
    from users
    where id = ${userId}`

  return query
}
