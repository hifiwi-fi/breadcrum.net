/**
 * Re-export PgBoss for use across the monorepo.
 * This allows other packages to import PgBoss without directly depending on pg-boss.
 *
 * Usage in other packages:
 * import PgBoss from '@breadcrum/resources/pgboss/types.js'
 *
 * For types, access them via the PgBoss namespace:
 * - PgBoss.WorkHandler<DataType>
 * - PgBoss.ConstructorOptions
 * - PgBoss.SendOptions
 * - PgBoss.InsertOptions
 * - PgBoss.JobInsert<DataType>
 * - PgBoss.Queue
 */

export * from 'pg-boss'
