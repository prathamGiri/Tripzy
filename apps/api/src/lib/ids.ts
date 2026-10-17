import { randomBytes, randomInt } from 'node:crypto'

/** Secret member token. Possession = identity, so make it long and random. */
export const newToken = () => randomBytes(24).toString('base64url')

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no 0/o/1/l/i to avoid typos when shared by voice
/** Short, readable invite code, e.g. "goa-k7m3qx". */
export function newInviteCode(prefix: string) {
  const p = prefix.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 8) || 'trip'
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return `${p}-${s}`
}
