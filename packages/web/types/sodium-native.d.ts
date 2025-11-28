/* eslint-disable camelcase */
declare module 'sodium-native' {
  export const crypto_secretbox_KEYBYTES: number

  export function randombytes_buf (buffer: Buffer): void

  const sodium: {
    crypto_secretbox_KEYBYTES: number;
    randombytes_buf: (buffer: Buffer) => void;
  }

  export default sodium
}
