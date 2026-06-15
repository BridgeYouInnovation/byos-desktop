import { getDb } from '../db/connection'
import { getLang } from '../prefs'
import { parsePermissions } from '@core/permissions'
import { resolveAccess } from '@core/access'
import { deriveSubscriptionStatus } from '@core/subscription'
import type { TenantContextDTO, TenantDTO, UserDTO } from '@core/dto'

type TenantRow = {
  id: string
  businessName: string
  slug: string
  industryType: string
  city: string | null
  phone: string | null
  email: string | null
  currency: string
  language: string
  logoUrl: string | null
  themePrimary: string
  themeSecondary: string
  receiptHeader: string | null
  subscriptionStatus: string
}

function tenantToDTO(t: TenantRow): TenantDTO {
  return {
    id: t.id,
    businessName: t.businessName,
    slug: t.slug,
    industryType: t.industryType,
    city: t.city,
    phone: t.phone,
    email: t.email,
    currency: t.currency,
    language: t.language,
    logoUrl: t.logoUrl,
    themePrimary: t.themePrimary,
    themeSecondary: t.themeSecondary,
    receiptHeader: t.receiptHeader,
    subscriptionStatus: t.subscriptionStatus
  }
}

// Lazily transition subscription status by the calendar (the desktop equivalent
// of refreshTenantSubscription — runs on workspace load). Admin-forced states
// are preserved. Pure derivation lives in @core/subscription.
function refreshSubscription(tenantId: string): void {
  const db = getDb()
  const tenant = db
    .prepare('SELECT subscriptionStatus FROM Tenant WHERE id = ?')
    .get(tenantId) as { subscriptionStatus: string } | undefined
  if (!tenant || tenant.subscriptionStatus === 'suspended' || tenant.subscriptionStatus === 'cancelled') {
    return
  }
  const sub = db
    .prepare('SELECT * FROM Subscription WHERE tenantId = ? ORDER BY createdAt DESC LIMIT 1')
    .get(tenantId) as
    | { id: string; currentPeriodEnd: string | null; gracePeriodEnd: string | null }
    | undefined
  if (!sub?.currentPeriodEnd) return

  const next = deriveSubscriptionStatus({
    now: new Date(),
    periodEnd: new Date(sub.currentPeriodEnd),
    graceEnd: sub.gracePeriodEnd ? new Date(sub.gracePeriodEnd) : null
  })
  if (next && next !== tenant.subscriptionStatus) {
    const at = new Date().toISOString()
    db.prepare('UPDATE Tenant SET subscriptionStatus = ?, updatedAt = ?, syncState = ? WHERE id = ?').run(
      next,
      at,
      'dirty',
      tenantId
    )
    db.prepare('UPDATE Subscription SET status = ?, updatedAt = ?, syncState = ? WHERE id = ?').run(
      next,
      at,
      'dirty',
      sub.id
    )
  }
}

// Single-tenant-per-device: resolve the one business this user operates here.
export function getTenantContext(user: UserDTO): TenantContextDTO | null {
  const db = getDb()
  const membership = db
    .prepare(
      `SELECT tu.roleId
         FROM TenantUser tu
         JOIN Tenant t ON t.id = tu.tenantId
        WHERE tu.userId = ? AND tu.status = 'active' AND t.deletedAt IS NULL
        ORDER BY tu.createdAt ASC LIMIT 1`
    )
    .get(user.id) as { roleId: string | null } | undefined
  if (!membership) return null

  const tenantRow = db
    .prepare(
      `SELECT t.* FROM Tenant t
         JOIN TenantUser tu ON tu.tenantId = t.id
        WHERE tu.userId = ? AND tu.status = 'active' AND t.deletedAt IS NULL
        ORDER BY tu.createdAt ASC LIMIT 1`
    )
    .get(user.id) as TenantRow | undefined
  if (!tenantRow) return null

  refreshSubscription(tenantRow.id)
  // Re-read status after a possible transition.
  const status = (
    db.prepare('SELECT subscriptionStatus FROM Tenant WHERE id = ?').get(tenantRow.id) as {
      subscriptionStatus: string
    }
  ).subscriptionStatus
  tenantRow.subscriptionStatus = status

  const role = membership.roleId
    ? (db.prepare('SELECT id, name, isSystemRole, permissionsJson FROM Role WHERE id = ?').get(
        membership.roleId
      ) as { id: string; name: string; isSystemRole: number; permissionsJson: string } | undefined)
    : undefined

  const permissions = parsePermissions(role?.permissionsJson)
  const isOwner = role?.isSystemRole === 1 && role?.name === 'Business Owner'
  const modules = (
    db.prepare('SELECT moduleKey FROM TenantModule WHERE tenantId = ? AND enabled = 1').all(
      tenantRow.id
    ) as { moduleKey: string }[]
  ).map((m) => m.moduleKey)

  return {
    user,
    tenant: tenantToDTO(tenantRow),
    role: role ? { id: role.id, name: role.name, isSystemRole: !!role.isSystemRole } : null,
    permissions,
    isOwner,
    access: resolveAccess(status, getLang()),
    modules
  }
}
