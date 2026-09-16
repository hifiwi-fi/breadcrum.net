/**
 * @import { FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof envSchema} EnvSchemaType
 * @typedef {FromSchema<EnvSchemaType>} DotEnvSchemaType
 */
import { envSchema } from '../../runtime/env-schema.js'
export { envSchema }
