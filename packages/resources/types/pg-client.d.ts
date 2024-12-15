import { PoolClient } from 'pg'
import { PostgresDb } from '@fastify/postgres'

export type PgClient = PoolClient | PostgresDb
