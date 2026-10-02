/**
 * @file Fastify utility types for extracting response and request types
 */

// /** @type { ExtractResponseType<typeof reply.code<201>>['auth_token'] | undefined } */

/**
 * Extracts the response body type accepted by a schema-narrowed Fastify reply.
 *
 * Use this when you want the full public response type, including any index
 * signature introduced by `additionalProperties: true`.
 *
 * @example
 * ```ts
 * type ResponseBody = ExtractResponseType<typeof reply.code<200>>
 *
 * // Public response types may allow future fields.
 * const responseBody: ResponseBody = {
 *   id: clientId,
 *   display_name: displayName,
 * }
 *
 * reply.code(200).send(responseBody)
 * ```
 */
export type ExtractResponseType<
  T extends (...args: any) => { send: (...args: any) => any }
> = NonNullable<Parameters<ReturnType<T>['send']>[0]>

/**
 * Removes broad string, number, and symbol index signatures from a type while
 * preserving explicitly declared properties.
 *
 * Use this to turn an open public API type into a stricter producer-side type.
 *
 * @example
 * ```ts
 * type PublicResponse = {
 *   id: string
 *   display_name: string
 *   [key: string]: unknown
 * }
 *
 * type ProducedResponse = KnownProperties<PublicResponse>
 *
 * const responseBody: ProducedResponse = {
 *   id: clientId,
 *   display_name: displayName,
 *   // extra_field: true, // Type error: not an explicitly declared property.
 * }
 * ```
 */
export type KnownProperties<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K]
}

/**
 * Extracts a Fastify response body type and removes public index signatures.
 *
 * Use this in route handlers when the published schema is intentionally
 * forward-compatible with `additionalProperties: true`, but the server should
 * only construct response objects from fields declared in the current schema.
 *
 * @example
 * ```ts
 * type ResponseBody = ExtractKnownResponseType<typeof reply.code<201>>
 *
 * const responseBody: ResponseBody = {
 *   client_id: clientId,
 *   client_name: clientName,
 *   redirect_uris: redirectUris,
 *   // unexpected_field: true, // Type error in server-side construction.
 * }
 *
 * reply.code(201).send(responseBody)
 * ```
 */
export type ExtractKnownResponseType<
  T extends (...args: any) => { send: (...args: any) => any }
> = KnownProperties<ExtractResponseType<T>>
