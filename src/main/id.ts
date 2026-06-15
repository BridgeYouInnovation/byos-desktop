import { randomBytes } from 'crypto'

// cuid-style collision-resistant id, client-generated so offline-created rows
// never collide on sync. Format: 'c' + base36 time + base36 randomness.
let counter = Math.floor(Math.random() * 1e6)

export function cuid(): string {
  const time = Date.now().toString(36)
  const count = (counter++ & 0xffffff).toString(36).padStart(5, '0')
  const rand = randomBytes(8).toString('hex')
  return `c${time}${count}${rand}`.slice(0, 25)
}
