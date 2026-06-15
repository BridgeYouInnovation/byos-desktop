import { BACKEND_URL } from './config'
import { setSessionToken } from '../prefs'
import { getPowerSync, connectSync } from './powersync'

export type OnlineUser = { id: string; fullName: string; email: string | null; phone: string | null }

// Online login: exchange credentials for a desktop-session token (used as the
// bearer for sync), persist it, cache the user locally for offline re-login, and
// start syncing. Returns null on bad credentials / no business.
export async function onlineLogin(
  identifier: string,
  password: string
): Promise<{ user: OnlineUser } | { error: string }> {
  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}/api/desktop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    })
  } catch {
    return { error: 'offline' } // backend unreachable
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return { error: body.error || 'invalid' }
  }

  const { token, user } = (await res.json()) as { token: string; user: OnlineUser }
  setSessionToken(token)

  // Cache identity locally (local-only table) so a later offline session can
  // recognise the user. (Offline password re-check lands with the auth rework.)
  const ps = getPowerSync()
  await ps.execute('DELETE FROM local_auth')
  await ps.execute(
    'INSERT INTO local_auth (id, userId, fullName, email, phone) VALUES (uuid(), ?, ?, ?, ?)',
    [user.id, user.fullName, user.email, user.phone]
  )

  await connectSync()
  return { user }
}
