import bcrypt from 'bcryptjs'
import { getPowerSync, connectSync, disconnectSync, clearSyncedData } from '../sync/powersync'
import { requestOnlineLogin, type OnlineLoginOk } from '../sync/online-auth'
import { setSessionToken, getLoggedInUserId, setLoggedInUserId } from '../prefs'
import { getTenantContext } from './tenant'
import type { LoginResult, TenantContextDTO } from '@core/dto'

type LocalAuth = {
  userId: string
  fullName: string
  email: string | null
  phone: string | null
  passwordHash: string
  tenantId: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Wait for the tenant's rows to arrive after connecting (single-tenant-per-device:
// the Tenant row appearing means the initial pull has data).
async function waitForTenantData(timeoutMs: number): Promise<boolean> {
  const ps = getPowerSync()
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const t = await ps.getOptional<{ id: string }>('SELECT id FROM "Tenant" LIMIT 1')
    if (t) return true
    await sleep(500)
  }
  return false
}

// Online login: store the session token + cache the account locally (incl. bcrypt
// hash for offline re-login), connect sync, wait for the first pull, then build
// the workspace context from the synced data.
async function finishOnlineLogin(res: OnlineLoginOk): Promise<LoginResult> {
  const ps = getPowerSync()

  // Switching accounts on this device → wipe the previous tenant's synced data.
  const existing = await ps.getOptional<{ userId: string }>('SELECT userId FROM local_auth LIMIT 1')
  if (existing && existing.userId !== res.user.id) {
    await clearSyncedData()
  }

  setSessionToken(res.token)
  await ps.execute('DELETE FROM local_auth')
  await ps.execute(
    `INSERT INTO local_auth (id, userId, fullName, email, phone, passwordHash, tenantId)
     VALUES (uuid(), ?, ?, ?, ?, ?, ?)`,
    [res.user.id, res.user.fullName, res.user.email, res.user.phone, res.passwordHash, res.tenant.id]
  )
  setLoggedInUserId(res.user.id)

  await connectSync()
  await waitForTenantData(30_000)

  const ctx = await getTenantContext(res.user.id)
  return ctx ? { ok: true, context: ctx } : { ok: false, error: 'sync_failed' }
}

// Offline re-login: only possible for an account already provisioned on this
// device (a prior online login). Verifies the password against the cached hash.
async function offlineLogin(identifier: string, password: string): Promise<LoginResult> {
  const ps = getPowerSync()
  const row = await ps.getOptional<LocalAuth>('SELECT * FROM local_auth LIMIT 1')
  if (!row) return { ok: false, error: 'offline' } // never logged in online here

  const id = identifier.trim()
  const idMatch = id === row.email || id === row.phone
  if (!idMatch || !bcrypt.compareSync(password, row.passwordHash)) {
    return { ok: false, error: 'invalid' }
  }
  setLoggedInUserId(row.userId)
  await connectSync() // resumes when connectivity returns
  const ctx = await getTenantContext(row.userId)
  return ctx ? { ok: true, context: ctx } : { ok: false, error: 'no_data' }
}

// Login: try online (real verification + fresh sync token), fall back to offline
// re-login when the backend is unreachable.
export async function login(identifier: string, password: string): Promise<LoginResult> {
  const online = await requestOnlineLogin(identifier, password)
  if ('token' in online) return finishOnlineLogin(online)
  if (online.error === 'offline') return offlineLogin(identifier, password)
  return { ok: false, error: online.error }
}

// Restore the session on boot (works offline from cached data). Resumes sync.
export async function getCurrentContext(): Promise<TenantContextDTO | null> {
  const userId = getLoggedInUserId()
  if (!userId) return null
  const ps = getPowerSync()
  const row = await ps.getOptional<{ userId: string }>(
    'SELECT userId FROM local_auth WHERE userId = ?',
    [userId]
  )
  if (!row) return null
  await connectSync()
  return getTenantContext(userId)
}

export async function logout(): Promise<void> {
  setSessionToken(null)
  setLoggedInUserId(null)
  await disconnectSync()
  // Keep local_auth + synced data so the same user can re-login offline quickly.
}
