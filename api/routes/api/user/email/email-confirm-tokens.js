import SQL from '@nearform/sql'

export const EMAIL_CONFIRM_TOKEN_EXP = SQL`now() + interval '7 days'`
export const EMAIL_CONFIRM_TOKEN = SQL`encode(gen_random_bytes(32), 'hex')`
