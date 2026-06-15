import { BACKEND_URL } from './config'

export type OnlineUser = { id: string; fullName: string; email: string | null; phone: string | null }
export type OnlineLoginOk = {
  token: string
  user: OnlineUser
  passwordHash: string
  tenant: { id: string; businessName: string; slug: string; industryType: string }
}

// Pure network call: exchange credentials for a desktop-session token + identity.
// Returns { error: 'offline' } when the backend is unreachable so the caller can
// fall back to offline re-login. Storage, sync-connect and context-building are
// the auth repo's job.
export async function requestOnlineLogin(
  identifier: string,
  password: string
): Promise<OnlineLoginOk | { error: string }> {
  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}/api/desktop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    })
  } catch {
    return { error: 'offline' }
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return { error: body.error || 'invalid' }
  }
  return (await res.json()) as OnlineLoginOk
}
