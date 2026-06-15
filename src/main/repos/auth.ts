import bcrypt from 'bcryptjs'
import { getDb } from '../db/connection'
import { cuid } from '../id'
import { signSession, verifySession, SESSION_WINDOW_MS } from '../session'
import { getSessionToken, setSessionToken } from '../prefs'
import type { UserDTO } from '@core/dto'

type UserRow = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  passwordHash: string
  status: string
  emailVerifiedAt: string | null
  isPlatformAdmin: number
}

function toDTO(u: UserRow): UserDTO {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    isPlatformAdmin: !!u.isPlatformAdmin
  }
}

// Offline login: verify the identifier + password against the local User row
// (bcrypt hash synced/seeded from the cloud). Mirrors web loginAction, minus the
// email re-send (which needs connectivity). Returns null on any failure — the
// caller surfaces a generic message (no field-level enumeration).
export async function login(
  identifier: string,
  password: string
): Promise<{ user: UserDTO } | { error: 'invalid' | 'unverified' } | null> {
  const db = getDb()
  const id = identifier.trim()
  if (!id || !password) return { error: 'invalid' }

  const user = db
    .prepare('SELECT * FROM User WHERE email = ? OR phone = ?')
    .get(id, id) as UserRow | undefined

  if (!user || user.status !== 'active' || !bcrypt.compareSync(password, user.passwordHash)) {
    return { error: 'invalid' }
  }
  // The synced account must have completed email verification online once.
  if (!user.emailVerifiedAt) return { error: 'unverified' }

  const now = new Date()
  const jti = cuid()
  const expiresAt = new Date(now.getTime() + SESSION_WINDOW_MS)
  db.prepare(
    `INSERT INTO Session (id, userId, jti, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)`
  ).run(cuid(), user.id, jti, expiresAt.toISOString(), now.toISOString())
  db.prepare('UPDATE User SET lastLoginAt = ? WHERE id = ?').run(now.toISOString(), user.id)

  const token = await signSession(user.id, jti)
  setSessionToken(token)

  return { user: toDTO(user) }
}

// Resolve the persisted session to the current user (boot + every request).
export async function getCurrentUser(): Promise<UserDTO | null> {
  const token = getSessionToken()
  if (!token) return null
  const payload = await verifySession(token)
  if (!payload) return null

  const db = getDb()
  const session = db.prepare('SELECT * FROM Session WHERE jti = ?').get(payload.jti) as
    | { userId: string; revokedAt: string | null; expiresAt: string }
    | undefined
  if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) return null
  if (session.userId !== payload.uid) return null

  const user = db.prepare('SELECT * FROM User WHERE id = ?').get(payload.uid) as UserRow | undefined
  if (!user || user.status !== 'active') return null
  return toDTO(user)
}

export async function logout(): Promise<void> {
  const token = getSessionToken()
  if (token) {
    const payload = await verifySession(token)
    if (payload) {
      getDb()
        .prepare('UPDATE Session SET revokedAt = ? WHERE jti = ?')
        .run(new Date().toISOString(), payload.jti)
    }
  }
  setSessionToken(null)
}
