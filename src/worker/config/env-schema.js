/**
 * @import { FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof envSchema} EnvSchemaType
 * @typedef {FromSchema<EnvSchemaType>} DotEnvSchemaType
 */
import { schemaForRole } from '../../runtime/env-schema.js'
export const envSchema = schemaForRole('worker')
