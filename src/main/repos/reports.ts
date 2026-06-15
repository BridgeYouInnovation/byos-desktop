import { getPowerSync } from '../sync/powersync'
import type { ReportSummary } from '@core/dto'

const MONEY_IN = "('sale','income')"

// Period summary from the local PowerSync DB: money in/out, by-category breakdown,
// top products, daily in/out series.
export async function getReportSummary(tenantId: string, fromISO: string, toISO: string): Promise<ReportSummary> {
  const ps = getPowerSync()
  const p = [tenantId, fromISO, toISO]

  const [totals, byCategory, topProducts, daily] = await Promise.all([
    ps.get<{ inMinor: number; outMinor: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN kind IN ${MONEY_IN} THEN amountMinor ELSE 0 END), 0) AS inMinor,
         COALESCE(SUM(CASE WHEN kind = 'expense' THEN amountMinor ELSE 0 END), 0) AS outMinor
       FROM "Record"
      WHERE tenantId = ? AND isVoid = 0 AND deletedAt IS NULL AND recordDate >= ? AND recordDate <= ?`,
      p
    ),
    ps.getAll<{ name: string; kind: string; totalMinor: number }>(
      `SELECT COALESCE(cat.name, '(uncategorized)') AS name, r.kind AS kind, SUM(r.amountMinor) AS totalMinor
         FROM "Record" r
         LEFT JOIN "RecordCategory" cat ON cat.id = r.categoryId
        WHERE r.tenantId = ? AND r.isVoid = 0 AND r.deletedAt IS NULL
          AND r.kind IN ('income','expense') AND r.recordDate >= ? AND r.recordDate <= ?
        GROUP BY name, r.kind
        ORDER BY totalMinor DESC`,
      p
    ),
    ps.getAll<{ name: string; quantity: number; totalMinor: number }>(
      `SELECT ri.name AS name, SUM(ri.quantity) AS quantity, SUM(ri.lineTotalMinor) AS totalMinor
         FROM "RecordItem" ri
         JOIN "Record" r ON r.id = ri.recordId
        WHERE r.tenantId = ? AND r.kind = 'sale' AND r.isVoid = 0 AND r.deletedAt IS NULL
          AND r.recordDate >= ? AND r.recordDate <= ?
        GROUP BY ri.name
        ORDER BY totalMinor DESC
        LIMIT 8`,
      p
    ),
    ps.getAll<{ date: string; inMinor: number; outMinor: number }>(
      `SELECT substr(recordDate, 1, 10) AS date,
              COALESCE(SUM(CASE WHEN kind IN ${MONEY_IN} THEN amountMinor ELSE 0 END), 0) AS inMinor,
              COALESCE(SUM(CASE WHEN kind = 'expense' THEN amountMinor ELSE 0 END), 0) AS outMinor
         FROM "Record"
        WHERE tenantId = ? AND isVoid = 0 AND deletedAt IS NULL AND recordDate >= ? AND recordDate <= ?
        GROUP BY date
        ORDER BY date`,
      p
    )
  ])

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
