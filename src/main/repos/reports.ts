import { getDb } from '../db/connection'
import type { ReportSummary } from '@core/dto'

const MONEY_IN = "('sale','income')"

// Period summary computed entirely from the local DB: money in/out, breakdown
// by category, top-selling products, and a daily in/out series.
export function getReportSummary(tenantId: string, fromISO: string, toISO: string): ReportSummary {
  const db = getDb()
  const params = { tenantId, from: fromISO, to: toISO }

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN kind IN ${MONEY_IN} THEN amountMinor ELSE 0 END), 0) AS inMinor,
         COALESCE(SUM(CASE WHEN kind = 'expense' THEN amountMinor ELSE 0 END), 0) AS outMinor
       FROM "Record"
      WHERE tenantId = @tenantId AND isVoid = 0 AND deletedAt IS NULL
        AND recordDate >= @from AND recordDate <= @to`
    )
    .get(params) as { inMinor: number; outMinor: number }

  const byCategory = db
    .prepare(
      `SELECT COALESCE(cat.name, '(uncategorized)') AS name, r.kind AS kind, SUM(r.amountMinor) AS totalMinor
         FROM "Record" r
         LEFT JOIN RecordCategory cat ON cat.id = r.categoryId
        WHERE r.tenantId = @tenantId AND r.isVoid = 0 AND r.deletedAt IS NULL
          AND r.kind IN ('income','expense')
          AND r.recordDate >= @from AND r.recordDate <= @to
        GROUP BY name, r.kind
        ORDER BY totalMinor DESC`
    )
    .all(params) as { name: string; kind: string; totalMinor: number }[]

  const topProducts = db
    .prepare(
      `SELECT ri.name AS name, SUM(ri.quantity) AS quantity, SUM(ri.lineTotalMinor) AS totalMinor
         FROM RecordItem ri
         JOIN "Record" r ON r.id = ri.recordId
        WHERE r.tenantId = @tenantId AND r.kind = 'sale' AND r.isVoid = 0 AND r.deletedAt IS NULL
          AND r.recordDate >= @from AND r.recordDate <= @to
        GROUP BY ri.name
        ORDER BY totalMinor DESC
        LIMIT 8`
    )
    .all(params) as { name: string; quantity: number; totalMinor: number }[]

  const daily = db
    .prepare(
      `SELECT substr(recordDate, 1, 10) AS date,
              COALESCE(SUM(CASE WHEN kind IN ${MONEY_IN} THEN amountMinor ELSE 0 END), 0) AS inMinor,
              COALESCE(SUM(CASE WHEN kind = 'expense' THEN amountMinor ELSE 0 END), 0) AS outMinor
         FROM "Record"
        WHERE tenantId = @tenantId AND isVoid = 0 AND deletedAt IS NULL
          AND recordDate >= @from AND recordDate <= @to
        GROUP BY date
        ORDER BY date`
    )
    .all(params) as { date: string; inMinor: number; outMinor: number }[]

  return {
    from: fromISO,
    to: toISO,
    totalInMinor: totals.inMinor,
    totalOutMinor: totals.outMinor,
    netMinor: totals.inMinor - totals.outMinor,
    byCategory,
    topProducts,
    daily
  }
}
