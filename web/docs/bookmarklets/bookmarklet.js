import getBookmarklet from '@breadcrum/bookmarklet'

export const bookmarklet = getBookmarklet({
  TRANSPORT: process.env.TRANSPORT,
  HOST: process.env.HOST,
  WINDOW_TITLE: '🥖 Breadcrum'
})

console.log({ bookmarklet })
