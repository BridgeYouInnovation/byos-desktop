import { getPowerSync } from '../sync/powersync'
import type { DashboardMetrics, RecentRecordDTO } from '@core/dto'

const MONEY_IN = "('sale','income')"

async function sumSince(tenantId: string, kinds: 'in' | 'out', sinceISO: string): Promise<number> {
  const ps = getPowerSync()
  const clause = kinds === 'in' ? `kind IN ${MONEY_IN}` : `kind = 'expense'`
  const row = await ps.get<{ total: number }>(
    `SELECT COALESCE(SUM(amountMinor), 0) AS total FROM "Record"
      WHERE tenantId = ? AND ${clause} AND isVoid = 0 AND deletedAt IS NULL AND recordDate >= ?`,
    [tenantId, sinceISO]
  )
  return row.total
}

// Dashboard aggregates from the local PowerSync DB (offline). Same numbers the
// web computes; data is the tenant's synced rows.
export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
  const ps = getPowerSync()
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const count = async (sql: string, params: unknown[] = []): Promise<number> =>
    (await ps.get<{ c: number }>(sql, params as never[])).c

  const recent = await ps.getAll<RecentRecordDTO>(
    `SELECT r.id, r.kind, r.recordNumber, r.amountMinor, r.description, r.recordDate, c.name AS contactName
       FROM "Record" r
       LEFT JOIN "Contact" c ON c.id = r.contactId
      WHERE r.tenantId = ? AND r.deletedAt IS NULL
      ORDER BY r.recordDate DESC, r.createdAt DESC
      LIMIT 8`,
    [tenantId]
  )

  const [todayIn, todayOut, monthIn, monthOut, recordCount, contactCount, productCount, lowStockCount] =
    await Promise.all([
      sumSince(tenantId, 'in', startOfDay),
      sumSince(tenantId, 'out', startOfDay),
      sumSince(tenantId, 'in', startOfMonth),
      sumSince(tenantId, 'out', startOfMonth),
      count(`SELECT COUNT(*) AS c FROM "Record" WHERE tenantId = ? AND deletedAt IS NULL`, [tenantId]),
      count(`SELECT COUNT(*) AS c FROM "Contact" WHERE tenantId = ? AND deletedAt IS NULL`, [tenantId]),
      count(
        `SELECT COUNT(*) AS c FROM "Product" WHERE tenantId = ? AND deletedAt IS NULL AND status = 'active'`,
        [tenantId]
      ),
      count(
        `SELECT COUNT(*) AS c FROM "Product" p JOIN "InventoryBalance" b ON b.productId = p.id
          WHERE p.tenantId = ? AND p.deletedAt IS NULL AND p.trackStock = 1 AND b.quantity <= p.reorderLevel`,
        [tenantId]
      )
    ])

  return {
    todayInMinor: todayIn,
    todayOutMinor: todayOut,
    monthInMinor: monthIn,
    monthOutMinor: monthOut,
    recordCount,
    contactCount,
    productCount,
    lowStockCount,
    recent
  }
}
