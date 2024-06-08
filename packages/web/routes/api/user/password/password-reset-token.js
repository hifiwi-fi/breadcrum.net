import SQL from '@nearform/sql'

export const PASSWORD_RESET_EXP = SQL`now() + interval '24 hours'`
export const PASSWORD_RESET_TOKEN = SQL`encode(gen_random_bytes(32), 'hex')`
