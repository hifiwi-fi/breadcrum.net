import { getAdminStats } from './get-admin-stats.js'

export default async function adminStatsRoutes (fastify, opts) {
  await Promise.all([
    getAdminStats(fastify, opts),
  ])
}
