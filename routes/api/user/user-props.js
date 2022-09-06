import S from 'fluent-json-schema'

export const userJsonSchema = S.object()
  .prop('id', S.string().format('uuid'))
  .prop('email', S.string().format('email'))
  .prop('username', S.string())
  .prop('email_confirmed', S.boolean())
