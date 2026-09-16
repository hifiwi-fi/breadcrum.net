import type {
  ExtractKnownResponseType,
  ExtractResponseType,
  KnownProperties,
} from './fastify-utils.ts'
import type { FromSchema } from 'json-schema-to-ts'

export const openResponseSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['id'],
  properties: {
    id: { type: 'string' },
    display_name: { type: 'string' },
  },
} as const

type ReplyCode<TBody> = (...args: any) => {
  send: (body: TBody) => unknown
}

type PublicResponse = FromSchema<typeof openResponseSchema>

export const publicResponseAllowsFutureFields: ExtractResponseType<
  ReplyCode<PublicResponse>
> = {
  id: 'client_123',
  future_field: true,
}

type KnownResponse = KnownProperties<PublicResponse>

export const knownResponse: KnownResponse = {
  id: 'client_123',
  display_name: 'Client',
}

export const knownResponseRejectsFutureFields: KnownResponse = {
  id: 'client_123',
  // @ts-expect-error Producer response objects can only use declared fields.
  future_field: true,
}

// @ts-expect-error Producer response objects must still include required fields.
export const knownResponseRequiresId: KnownResponse = {
  display_name: 'Client',
}

type ExtractedKnownResponse = ExtractKnownResponseType<
  ReplyCode<PublicResponse>
>

export const extractedKnownResponse: ExtractedKnownResponse = {
  id: 'client_123',
  display_name: 'Client',
}

export const extractedKnownResponseRejectsFutureFields: ExtractedKnownResponse =
  {
    id: 'client_123',
    // @ts-expect-error ExtractKnownResponseType removes the public index signature.
    future_field: true,
  }
