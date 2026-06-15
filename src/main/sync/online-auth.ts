import { BACKEND_URL } from './config'
import type { BusinessChoice } from '@core/dto'

export type OnlineUser = { id: string; fullName: string; email: string | null; phone: string | null }

// A tenant-scoped login (business chosen or only one).
export type OnlineLoginScoped = {
  token: string
  user: OnlineUser
  passwordHash: string
  tenant: { id: string; businessName: string; slug: string; industryType: string }
}
// Credentials are valid but the account has multiple businesses — choose one.
export type OnlineLoginChoose = {
  businesses: BusinessChoice[]
  user: OnlineUser
  passwordHash: string
}

export type OnlineLoginResult = OnlineLoginScoped | OnlineLoginChoose | { error: string }

// Pure network call. Pass tenantId to scope to a chosen business; omit it to let
// the server auto-select (single business) or return the list to pick from.
export async function requestOnlineLogin(
  identifier: string,
  password: string,
  tenantId?: string
): Promise<OnlineLoginResult> {
  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}/api/desktop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, tenantId })
    })
  } catch {
    return { error: 'offline' }
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return { error: body.error || 'invalid' }
  }
  return (await res.json()) as OnlineLoginScoped | OnlineLoginChoose
}
