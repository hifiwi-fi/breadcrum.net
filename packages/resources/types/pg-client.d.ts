import type { PoolClient } from 'pg'
import type { PostgresDb } from '@fastify/postgres'

export type PgClient = PoolClient | PostgresDb
