/**
 * @import { FastifyServerOptions } from 'fastify'
 * @import { Role } from './role.js'
 * @import { RuntimeConfig } from './env-schema.js'
 * @typedef {object} AppOptions
 * @property {Role} role
 * @property {Partial<RuntimeConfig> | undefined} [envData]
 * @property {string | false | undefined} [dotEnvPath]
 * @property {RuntimeConfig | undefined} [config]
 * @property {FastifyServerOptions | undefined} [serverOptions]
 */
export {}
