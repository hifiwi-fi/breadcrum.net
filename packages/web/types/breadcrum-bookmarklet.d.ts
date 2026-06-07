declare module '@breadcrum/bookmarklet' {
  export default function getBookmarklet (vars?: Record<string, string>): string
}

declare module '@breadcrum/bookmarklet/dist/version.js' {
  export const version: string
}
