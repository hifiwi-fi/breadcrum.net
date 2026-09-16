// @ts-expect-error - No type definitions available for @breadcrum/bookmarklet
import getBookmarklet from '@breadcrum/bookmarklet'

export const bookmarklet = getBookmarklet({
  TRANSPORT: process.env['TRANSPORT'],
  HOST: process.env['HOST'],
  WINDOW_TITLE: '🥖 Breadcrum',
})
