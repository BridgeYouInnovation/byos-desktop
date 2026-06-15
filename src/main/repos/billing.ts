import { getPowerSync } from '../sync/powersync'
import type { SubscriptionInfo, RoleInfo } from '@core/dto'

// Latest subscription for the tenant (synced), for the Subscription screen.
export async function getSubscriptionInfo(tenantId: string): Promise<SubscriptionInfo> {
  return getPowerSync().getOptional<NonNullable<SubscriptionInfo>>(
    `SELECT planName, priceMinor, currency, status, currentPeriodStart, currentPeriodEnd, gracePeriodEnd
       FROM "Subscription" WHERE tenantId = ? ORDER BY createdAt DESC LIMIT 1`,
    [tenantId]
  )
}

// Roles + member counts (synced), for the Users & Roles screen. Other members'
// profiles aren't synced to the device (privacy), so full team management stays
// on the web — but roles + headcount are available offline.
export async function listRoles(tenantId: string): Promise<RoleInfo[]> {
  const ps = getPowerSync()
  const roles = await ps.getAll<{
    id: string
    name: string
    description: string | null
    isSystemRole: number
    permissionsJson: string
  }>(`SELECT id, name, description, isSystemRole, permissionsJson FROM "Role" WHERE tenantId = ? ORDER BY name`, [
    tenantId
  ])
  const out: RoleInfo[] = []
  for (const r of roles) {
    const { c } = await ps.get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM "TenantUser" WHERE tenantId = ? AND roleId = ? AND status = 'active'`,
      [tenantId, r.id]
    )
    let permissionCount = 0
    try {
      const parsed = JSON.parse(r.permissionsJson)
      permissionCount = Array.isArray(parsed) ? (parsed.includes('*') ? -1 : parsed.length) : 0
    } catch {
      /* ignore */
    }
    out.push({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystemRole: !!r.isSystemRole,
      permissionCount,
      memberCount: c
    })
  }
  return out
}
