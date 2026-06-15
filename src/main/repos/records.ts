import type { Transaction } from '@powersync/node'
import { getPowerSync } from '../sync/powersync'
import { cuid } from '../id'
import { defaultBranchId } from './refs'
import type {
  CreateSaleInput,
  CreateSimpleInput,
  RecordListItem,
  RecordDetailDTO,
  RecordItemDTO
} from '@core/dto'

const PREFIX: Record<string, string> = { sale: 'SAL', income: 'INC', expense: 'EXP', transfer: 'TRF' }

async function nextRecordNumber(tenantId: string, kind: string): Promise<string> {
  const prefix = PREFIX[kind] || 'REC'
  const { c } = await getPowerSync().get<{ c: number }>(
    'SELECT COUNT(*) AS c FROM "Record" WHERE tenantId = ? AND kind = ?',
    [tenantId, kind]
  )
  return `${prefix}-${String(c + 1).padStart(4, '0')}`
}

// Append an immutable stock movement + recompute the balance, inside the sale's
// transaction. PowerSync queues each write for upload automatically.
async function applyStockOut(
  tx: Transaction,
  tenantId: string,
  productId: string,
  branchId: string,
  quantity: number,
  recordId: string,
  userId: string | null,
  whenISO: string
): Promise<void> {
  const product = (
    await tx.getAll<{ trackStock: number }>('SELECT trackStock FROM "Product" WHERE id = ?', [productId])
  )[0]
  if (!product || !product.trackStock) return

  await tx.execute(
    `INSERT INTO "InventoryMovement" (id, tenantId, productId, branchId, movementType, quantity, referenceType, referenceId, movementDate, createdById, createdAt)
     VALUES (?, ?, ?, ?, 'sale', ?, 'record', ?, ?, ?, ?)`,
    [cuid(), tenantId, productId, branchId, quantity, recordId, whenISO, userId, whenISO]
  )
  const bal = (
    await tx.getAll<{ id: string; quantity: number }>(
      'SELECT id, quantity FROM "InventoryBalance" WHERE productId = ? AND branchId = ?',
      [productId, branchId]
    )
  )[0]
  if (bal) {
    await tx.execute('UPDATE "InventoryBalance" SET quantity = ? WHERE id = ?', [bal.quantity - quantity, bal.id])
  } else {
    await tx.execute(
      'INSERT INTO "InventoryBalance" (id, tenantId, productId, branchId, quantity) VALUES (?, ?, ?, ?, ?)',
      [cuid(), tenantId, productId, branchId, -quantity]
    )
  }
}

export async function createSale(tenantId: string, userId: string, input: CreateSaleInput): Promise<string> {
  const ps = getPowerSync()
  const branchId = await defaultBranchId(tenantId)
  const items = input.items.filter((i) => i.name && i.quantity > 0)
  if (items.length === 0) throw new Error('A sale needs at least one item.')

  const subtotal = items.reduce((s, i) => s + Math.round(i.unitPriceMinor) * i.quantity, 0)
  const discount = Math.max(0, Math.round(input.discountMinor ?? 0))
  const amount = Math.max(0, subtotal - discount)
  const when = input.recordDate ? new Date(input.recordDate).toISOString() : new Date().toISOString()
  const now = new Date().toISOString()
  const id = cuid()
  const number = await nextRecordNumber(tenantId, 'sale')

  await ps.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO "Record" (id, tenantId, kind, recordNumber, branchId, contactId, accountId, recordDate,
                             subtotalMinor, discountMinor, amountMinor, currency, paymentStatus, approvalStatus,
                             createdById, isVoid, createdAt, updatedAt)
       VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?, ?, ?, 'XAF', ?, 'none', ?, 0, ?, ?)`,
      [id, tenantId, number, branchId, input.contactId ?? null, input.accountId ?? null, when, subtotal, discount, amount, input.paymentStatus ?? 'paid', userId, now, now]
    )
    for (const it of items) {
      await tx.execute(
        `INSERT INTO "RecordItem" (id, recordId, productId, name, quantity, unitPriceMinor, lineTotalMinor)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cuid(), id, it.productId ?? null, it.name, it.quantity, Math.round(it.unitPriceMinor), Math.round(it.unitPriceMinor) * it.quantity]
      )
      if (it.productId && branchId) await applyStockOut(tx, tenantId, it.productId, branchId, it.quantity, id, userId, when)
    }
  })
  return id
}

async function createSimple(
  tenantId: string,
  userId: string,
  kind: 'income' | 'expense',
  input: CreateSimpleInput
): Promise<string> {
  const amount = Math.round(input.amountMinor)
  if (!(amount > 0)) throw new Error('Amount must be greater than zero.')
  const branchId = await defaultBranchId(tenantId)
  const when = input.recordDate ? new Date(input.recordDate).toISOString() : new Date().toISOString()
  const now = new Date().toISOString()
  const id = cuid()
  const number = await nextRecordNumber(tenantId, kind)

  await getPowerSync().execute(
    `INSERT INTO "Record" (id, tenantId, kind, recordNumber, branchId, contactId, categoryId, accountId, recordDate,
                           subtotalMinor, amountMinor, currency, paymentStatus, approvalStatus, description,
                           createdById, isVoid, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'XAF', 'paid', 'none', ?, ?, 0, ?, ?)`,
    [id, tenantId, kind, number, branchId, input.contactId ?? null, input.categoryId ?? null, input.accountId ?? null, when, amount, amount, input.description ?? null, userId, now, now]
  )
  return id
}

export const createIncome = (t: string, u: string, i: CreateSimpleInput) => createSimple(t, u, 'income', i)
export const createExpense = (t: string, u: string, i: CreateSimpleInput) => createSimple(t, u, 'expense', i)

export async function listRecords(
  tenantId: string,
  opts: { kind?: string; limit?: number; offset?: number } = {}
): Promise<RecordListItem[]> {
  const limit = Math.min(opts.limit ?? 100, 500)
  const offset = opts.offset ?? 0
  const params: unknown[] = [tenantId]
  let kindClause = ''
  if (opts.kind) {
    kindClause = 'AND r.kind = ?'
    params.push(opts.kind)
  }
  params.push(limit, offset)
  return getPowerSync().getAll<RecordListItem>(
    `SELECT r.id, r.kind, r.recordNumber, r.amountMinor, r.paymentStatus, r.description, r.recordDate,
            c.name AS contactName
       FROM "Record" r
       LEFT JOIN "Contact" c ON c.id = r.contactId
      WHERE r.tenantId = ? AND r.deletedAt IS NULL ${kindClause}
      ORDER BY r.recordDate DESC, r.createdAt DESC
      LIMIT ? OFFSET ?`,
    params as never[]
  )
}

export async function getRecordDetail(tenantId: string, id: string): Promise<RecordDetailDTO | null> {
  const ps = getPowerSync()
  const rec = await ps.getOptional<Omit<RecordDetailDTO, 'items'>>(
    `SELECT r.id, r.kind, r.recordNumber, r.amountMinor, r.subtotalMinor, r.discountMinor, r.currency,
            r.paymentStatus, r.description, r.recordDate, c.name AS contactName
       FROM "Record" r
       LEFT JOIN "Contact" c ON c.id = r.contactId
      WHERE r.tenantId = ? AND r.id = ? AND r.deletedAt IS NULL`,
    [tenantId, id]
  )
  if (!rec) return null
  const items = await ps.getAll<RecordItemDTO>(
    `SELECT id, productId, name, quantity, unitPriceMinor, lineTotalMinor FROM "RecordItem" WHERE recordId = ?`,
    [id]
  )
  return { ...rec, items }
}
