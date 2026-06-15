import { getDb } from '../db/connection'
import type { DashboardMetrics, RecentRecordDTO } from '@core/dto'

const MONEY_IN = "('sale','income')"

function sumBetween(tenantId: string, kinds: 'in' | 'out', sinceISO: string): number {
  const db = getDb()
  const clause =
    kinds === 'in' ? `kind IN ${MONEY_IN}` : `kind = 'expense'`
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amountMinor), 0) AS total
         FROM "Record"
        WHERE tenantId = ? AND ${clause} AND isVoid = 0 AND deletedAt IS NULL AND recordDate >= ?`
    )
    .get(tenantId, sinceISO) as { total: number }
  return row.total
}

// Dashboard aggregates, computed entirely from the local DB (offline).
export function getDashboardMetrics(tenantId: string): DashboardMetrics {
  const db = getDb()
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const count = (sql: string, ...args: unknown[]): number =>
    (db.prepare(sql).get(...args) as { c: number }).c

  const recent = db
    .prepare(
      `SELECT r.id, r.kind, r.recordNumber, r.amountMinor, r.description, r.recordDate, c.name AS contactName
         FROM "Record" r
         LEFT JOIN Contact c ON c.id = r.contactId
        WHERE r.tenantId = ? AND r.deletedAt IS NULL
        ORDER BY r.recordDate DESC, r.createdAt DESC
        LIMIT 8`
    )
    .all(tenantId) as RecentRecordDTO[]

  return {
    todayInMinor: sumBetween(tenantId, 'in', startOfDay),
    todayOutMinor: sumBetween(tenantId, 'out', startOfDay),
    monthInMinor: sumBetween(tenantId, 'in', startOfMonth),
    monthOutMinor: sumBetween(tenantId, 'out', startOfMonth),
    recordCount: count(`SELECT COUNT(*) AS c FROM "Record" WHERE tenantId = ? AND deletedAt IS NULL`, tenantId),
    contactCount: count(`SELECT COUNT(*) AS c FROM Contact WHERE tenantId = ? AND deletedAt IS NULL`, tenantId),
    productCount: count(
      `SELECT COUNT(*) AS c FROM Product WHERE tenantId = ? AND deletedAt IS NULL AND status = 'active'`,
      tenantId
    ),
    lowStockCount: count(
      `SELECT COUNT(*) AS c
         FROM Product p
         JOIN InventoryBalance b ON b.productId = p.id
        WHERE p.tenantId = ? AND p.deletedAt IS NULL AND p.trackStock = 1 AND b.quantity <= p.reorderLevel`,
      tenantId
    ),
    recent
  }
}
