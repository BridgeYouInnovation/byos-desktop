import { getDb } from '../db/connection'
import type { WorkspaceRefs, RefItem, ProductRef, ContactDTO } from '@core/dto'

// Reference data the record/stock forms need: default branch, categories,
// accounts, contacts and sellable products — all from the local DB.
export function getWorkspaceRefs(tenantId: string): WorkspaceRefs {
  const db = getDb()
  const branch = db
    .prepare(`SELECT id FROM Branch WHERE tenantId = ? AND deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1`)
    .get(tenantId) as { id: string } | undefined

  const cats = (kind: string): RefItem[] =>
    db
      .prepare(`SELECT id, name FROM RecordCategory WHERE tenantId = ? AND kind = ? ORDER BY name`)
      .all(tenantId, kind) as RefItem[]

  return {
    branchId: branch?.id ?? null,
    incomeCategories: cats('income'),
    expenseCategories: cats('expense'),
    accounts: db
      .prepare(`SELECT id, name FROM FinancialAccount WHERE tenantId = ? ORDER BY isDefault DESC, name`)
      .all(tenantId) as RefItem[],
    contacts: db
      .prepare(
        `SELECT id, contactType, name, phone, email, balanceMinor, notes
           FROM Contact WHERE tenantId = ? AND deletedAt IS NULL ORDER BY name`
      )
      .all(tenantId) as ContactDTO[],
    products: db
      .prepare(
        `SELECT id, name, sellingPriceMinor, unit
           FROM Product WHERE tenantId = ? AND deletedAt IS NULL AND status = 'active' ORDER BY name`
      )
      .all(tenantId) as ProductRef[]
  }
}

// Default branch id for a tenant (records/movements are scoped to it).
export function defaultBranchId(tenantId: string): string | null {
  const row = getDb()
    .prepare(`SELECT id FROM Branch WHERE tenantId = ? AND deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1`)
    .get(tenantId) as { id: string } | undefined
  return row?.id ?? null
}
