/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaArchiveCreate} SchemaArchiveCreate
 */

export const schemaArchiveCreate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:archive:create',
  properties: {
    createArchive: {
      anyOf: [
        {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
          },
          required: [
            'uri',
          ],
        },
        {
          type: 'boolean',
        },
        {
          type: 'null',
        },
      ],
    },
  },
})

export default schemaArchiveCreate
