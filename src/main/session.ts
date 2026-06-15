import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'

// Local session JWT, mirroring web/src/lib/auth.ts. The HS256 secret is
// generated once and stored in the app-data dir, so a token signed on this
// device validates offline. The JWT carries the user id + the session jti,
// which is checked against the local Session row (revocable).
const SESSION_DAYS = 30 // generous offline window; re-validated online in Phase 3

function secret(): Uint8Array {
  const f = join(app.getPath('userData'), 'session.key')
  let key: string
  if (existsSync(f)) {
    key = readFileSync(f, 'utf8')
  } else {
    key = randomBytes(48).toString('hex')
    writeFileSync(f, key, { mode: 0o600 })
  }
  return new TextEncoder().encode(key)
}

export async function signSession(uid: string, jti: string): Promise<string> {
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret())
}

export async function verifySession(token: string): Promise<{ uid: string; jti: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    const uid = payload.uid as string | undefined
    const jti = payload.jti as string | undefined
    if (!uid || !jti) return null
    return { uid, jti }
  } catch {
    return null
  }
}

export const SESSION_WINDOW_MS = SESSION_DAYS * 24 * 60 * 60 * 1000
