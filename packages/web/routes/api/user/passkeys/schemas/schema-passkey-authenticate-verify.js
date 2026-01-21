/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaPasskeyAuthenticateVerifyBody} SchemaPasskeyAuthenticateVerifyBody
 * @typedef {FromSchema<SchemaPasskeyAuthenticateVerifyBody>} TypePasskeyAuthenticateVerifyBody
 */

export const schemaPasskeyAuthenticateVerifyBody = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:passkey:authenticate:verify:body',
  additionalProperties: false,
  required: ['authentication'],
  properties: {
    authentication: {
      type: 'object',
      description: 'Authentication payload from client.authenticate()',
      additionalProperties: true,
      required: ['id', 'rawId', 'response', 'clientExtensionResults', 'type', 'challenge'],
      properties: {
        id: { type: 'string' },
        rawId: { type: 'string' },
        type: { type: 'string', enum: ['public-key'] },
        authenticatorAttachment: {
          type: 'string',
          enum: ['platform', 'cross-platform'],
        },
        clientExtensionResults: {
          type: 'object',
          additionalProperties: true,
        },
        challenge: { type: 'string' },
        response: {
          type: 'object',
          additionalProperties: true,
          required: ['clientDataJSON', 'authenticatorData', 'signature'],
          properties: {
            clientDataJSON: { type: 'string' },
            authenticatorData: { type: 'string' },
            signature: { type: 'string' },
            userHandle: { type: 'string' },
          }
        }
      }
    }
  }
})
