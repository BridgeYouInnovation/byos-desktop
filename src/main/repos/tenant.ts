import { getPowerSync } from '../sync/powersync'
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

function tenantToDTO(t: TenantRow, status: string): TenantDTO {
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
    subscriptionStatus: status
  }
}

// Effective subscription status, derived from the synced Subscription period
// dates (display only — NOT persisted, so the server stays the source of truth
// and we avoid sync write churn).
async function effectiveStatus(tenant: TenantRow): Promise<string> {
  if (tenant.subscriptionStatus === 'suspended' || tenant.subscriptionStatus === 'cancelled') {
    return tenant.subscriptionStatus
  }
  const ps = getPowerSync()
  const sub = await ps.getOptional<{ currentPeriodEnd: string | null; gracePeriodEnd: string | null }>(
    'SELECT currentPeriodEnd, gracePeriodEnd FROM "Subscription" ORDER BY createdAt DESC LIMIT 1'
  )
  if (!sub?.currentPeriodEnd) return tenant.subscriptionStatus
  const next = deriveSubscriptionStatus({
    now: new Date(),
    periodEnd: new Date(sub.currentPeriodEnd),
    graceEnd: sub.gracePeriodEnd ? new Date(sub.gracePeriodEnd) : null
  })
  return next ?? tenant.subscriptionStatus
}

// Single-tenant-per-device: the local DB only holds this device's tenant rows
// (PowerSync sync streams enforce isolation by the tenant_id JWT claim).
export async function getTenantContext(userId: string): Promise<TenantContextDTO | null> {
  const ps = getPowerSync()

  const tenantRow = await ps.getOptional<TenantRow>('SELECT * FROM "Tenant" LIMIT 1')
  if (!tenantRow) return null // not synced yet

  const membership = await ps.getOptional<{ roleId: string | null }>(
    `SELECT roleId FROM "TenantUser" WHERE userId = ? AND status = 'active' LIMIT 1`,
    [userId]
  )
  if (!membership) return null

  const auth = await ps.getOptional<{
    userId: string
    fullName: string
    email: string | null
    phone: string | null
  }>('SELECT userId, fullName, email, phone FROM local_auth WHERE userId = ?', [userId])
  if (!auth) return null
  const user: UserDTO = {
    id: auth.userId,
    fullName: auth.fullName,
    email: auth.email,
    phone: auth.phone,
    isPlatformAdmin: false
  }

  const role = membership.roleId
    ? await ps.getOptional<{ id: string; name: string; isSystemRole: number; permissionsJson: string }>(
        'SELECT id, name, isSystemRole, permissionsJson FROM "Role" WHERE id = ?',
        [membership.roleId]
      )
    : null

  const permissions = parsePermissions(role?.permissionsJson)
  const isOwner = role?.isSystemRole === 1 && role?.name === 'Business Owner'
  const modules = (
    await ps.getAll<{ moduleKey: string }>('SELECT moduleKey FROM "TenantModule" WHERE enabled = 1')
  ).map((m) => m.moduleKey)

  const status = await effectiveStatus(tenantRow)

  return {
    user,
    tenant: tenantToDTO(tenantRow, status),
    role: role ? { id: role.id, name: role.name, isSystemRole: !!role.isSystemRole } : null,
    permissions,
    isOwner,
    access: resolveAccess(status, getLang()),
    modules
  }
}
