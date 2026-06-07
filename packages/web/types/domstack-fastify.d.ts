declare module '@domstack/fastify' {
  import type { FastifyPluginAsync } from 'fastify'

  export type RouteContext = any
  export type RoutePageContext = any

  const domstackFastify: FastifyPluginAsync<any>
  export default domstackFastify
}

declare module '@domstack/fastify/build.js' {
  export function buildDomstackFastify (options: any): Promise<void>
}
