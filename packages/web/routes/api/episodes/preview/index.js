import { getPreview } from './get-preview.js'

export default async function previewRoutes (fastify, opts) {
  await Promise.all([
    getPreview(fastify, opts)
  ])
}
