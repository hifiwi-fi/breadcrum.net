import SQL from '@nearform/sql'

/**
 * Generates a SQL query fragment for hashing a password using the bcrypt algorithm.
 *
 * This function creates a SQL query fragment using the `@nearform/sql` library to safely
 * interpolate the password into the query. It utilizes PostgreSQL's `crypt` function in
 * conjunction with `gen_salt` to hash the password with the bcrypt algorithm. The resulting
 * SQL fragment can be used as part of a larger SQL query to store or compare hashed passwords
 * securely in the database.
 *
 * @param {string} password - The plaintext password to be hashed.
 * @returns {SQL.SqlStatement} A SQL query fragment for hashing the password.
 */
export const getPasswordHashQuery = (password) => SQL`crypt(${password}, gen_salt('bf'))`
