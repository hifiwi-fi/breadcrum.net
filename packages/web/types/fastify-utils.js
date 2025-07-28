/**
 * @file Fastify utility types for extracting response and request types
 */

// /** @type { ExtractResponseType<typeof reply.code<201>>['auth_token'] | undefined } */

/**
  * Extract the narrowed type from Fastify reply type
  * @template {(...args: any) => { send: (...args: any) => any }} T
  * @typedef {NonNullable<Parameters<ReturnType<T>['send']>[0]>} ExtractResponseType
  * @example
*/
