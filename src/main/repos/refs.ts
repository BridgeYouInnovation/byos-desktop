import { getPowerSync } from '../sync/powersync'
import type { WorkspaceRefs, RefItem, ProductRef, ContactDTO } from '@core/dto'

// Reference data the record/stock forms need, from the local PowerSync DB.
export async function getWorkspaceRefs(tenantId: string): Promise<WorkspaceRefs> {
  const ps = getPowerSync()
  const branch = await ps.getOptional<{ id: string }>(
    `SELECT id FROM "Branch" WHERE tenantId = ? AND deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1`,
    [tenantId]
  )

  const cats = (kind: string): Promise<RefItem[]> =>
    ps.getAll<RefItem>(
      `SELECT id, name FROM "RecordCategory" WHERE tenantId = ? AND kind = ? ORDER BY name`,
      [tenantId, kind]
    )

  const [incomeCategories, expenseCategories, accounts, contacts, products] = await Promise.all([
    cats('income'),
    cats('expense'),
    ps.getAll<RefItem>(
      `SELECT id, name FROM "FinancialAccount" WHERE tenantId = ? ORDER BY isDefault DESC, name`,
      [tenantId]
    ),
    ps.getAll<ContactDTO>(
      `SELECT id, contactType, name, phone, email, balanceMinor, notes
         FROM "Contact" WHERE tenantId = ? AND deletedAt IS NULL ORDER BY name`,
      [tenantId]
    ),
    ps.getAll<ProductRef>(
      `SELECT id, name, sellingPriceMinor, unit
         FROM "Product" WHERE tenantId = ? AND deletedAt IS NULL AND status = 'active' ORDER BY name`,
      [tenantId]
    )
  ])

  return { branchId: branch?.id ?? null, incomeCategories, expenseCategories, accounts, contacts, products }
}

export async function defaultBranchId(tenantId: string): Promise<string | null> {
  const row = await getPowerSync().getOptional<{ id: string }>(
    `SELECT id FROM "Branch" WHERE tenantId = ? AND deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1`,
    [tenantId]
  )
  return row?.id ?? null
}
