import SQL from '@nearform/sql'

export const getPasswordHashQuery = (password) => SQL`crypt(${password}, gen_salt('bf'))`
