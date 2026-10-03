/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @import { UnionToIntersection } from 'type-fest'
 * @typedef {{ required: readonly string[], properties: Record<string, JSONSchema> }} EnvSchemaFragment
 */

/**
 * @template {readonly EnvSchemaFragment[]} T
 * @typedef {{ required: ReadonlyArray<T[number]['required'][number]>, properties: UnionToIntersection<T[number]['properties']> }} MergedEnvSchemas
 */

/**
 * Merge plugin-local env schema fragments into a single fragment that preserves
 * the fragment property and required-key types for json-schema-to-ts consumers.
 *
 * @template {readonly EnvSchemaFragment[]} T
 * @param {T} schemas
 * @returns {MergedEnvSchemas<T>}
 */
export function mergeEnvSchemas (schemas) {
  return /** @type {MergedEnvSchemas<T>} */ ({
    required: schemas.flatMap(schema => schema.required),
    properties: Object.assign({}, ...schemas.map(schema => schema.properties)),
  })
}
