import { getDb } from '../db/connection'
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

// Sequential per-kind record number (SAL-0001…). Counts existing rows like the
// web provisioning helper.
function nextRecordNumber(tenantId: string, kind: string): string {
  const prefix = PREFIX[kind] || 'REC'
  const { c } = getDb()
    .prepare('SELECT COUNT(*) AS c FROM "Record" WHERE tenantId = ? AND kind = ?')
    .get(tenantId, kind) as { c: number }
  return `${prefix}-${String(c + 1).padStart(4, '0')}`
}

// Append a stock movement and recompute the affected balance row. Inventory is
// movement-append (immutable movements; balance derived) so it stays sync-safe.
function applyStockOut(
  tenantId: string,
  productId: string,
  branchId: string,
  quantity: number,
  recordId: string,
  userId: string | null,
  whenISO: string
): void {
  const db = getDb()
  const product = db
    .prepare('SELECT trackStock FROM Product WHERE id = ?')
    .get(productId) as { trackStock: number } | undefined
  if (!product || !product.trackStock) return

  db.prepare(
    `INSERT INTO InventoryMovement (id, tenantId, productId, branchId, movementType, quantity, referenceType, referenceId, movementDate, createdById, createdAt, syncState)
     VALUES (?, ?, ?, ?, 'sale', ?, 'record', ?, ?, ?, ?, 'dirty')`
  ).run(cuid(), tenantId, productId, branchId, quantity, recordId, whenISO, userId, whenISO)

  const bal = db
    .prepare('SELECT id, quantity FROM InventoryBalance WHERE productId = ? AND branchId = ?')
    .get(productId, branchId) as { id: string; quantity: number } | undefined
  if (bal) {
    db.prepare('UPDATE InventoryBalance SET quantity = ?, syncState = ? WHERE id = ?').run(
      bal.quantity - quantity,
      'dirty',
      bal.id
    )
  } else {
    db.prepare(
      'INSERT INTO InventoryBalance (id, tenantId, productId, branchId, quantity, syncState) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(cuid(), tenantId, productId, branchId, -quantity, 'dirty')
  }
}

export function createSale(tenantId: string, userId: string, input: CreateSaleInput): string {
  const db = getDb()
  const branchId = defaultBranchId(tenantId)
  const items = input.items.filter((i) => i.name && i.quantity > 0)
  if (items.length === 0) throw new Error('A sale needs at least one item.')

  return db.transaction(() => {
    const subtotal = items.reduce((s, i) => s + Math.round(i.unitPriceMinor) * i.quantity, 0)
    const discount = Math.max(0, Math.round(input.discountMinor ?? 0))
    const amount = Math.max(0, subtotal - discount)
    const when = input.recordDate ? new Date(input.recordDate).toISOString() : new Date().toISOString()
    const now = new Date().toISOString()
    const id = cuid()

    db.prepare(
      `INSERT INTO "Record" (id, tenantId, kind, recordNumber, branchId, contactId, accountId, recordDate,
                             subtotalMinor, discountMinor, amountMinor, currency, paymentStatus, approvalStatus,
                             description, createdById, createdAt, updatedAt, syncState)
       VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?, ?, ?, 'XAF', ?, 'none', NULL, ?, ?, ?, 'dirty')`
    ).run(
      id,
      tenantId,
      nextRecordNumber(tenantId, 'sale'),
      branchId,
      input.contactId ?? null,
      input.accountId ?? null,
      when,
      subtotal,
      discount,
      amount,
      input.paymentStatus ?? 'paid',
      userId,
      now,
      now
    )

    const insItem = db.prepare(
      `INSERT INTO RecordItem (id, recordId, productId, name, quantity, unitPriceMinor, lineTotalMinor, syncState)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'dirty')`
    )
    for (const it of items) {
      insItem.run(cuid(), id, it.productId ?? null, it.name, it.quantity, Math.round(it.unitPriceMinor), Math.round(it.unitPriceMinor) * it.quantity)
      if (it.productId && branchId) applyStockOut(tenantId, it.productId, branchId, it.quantity, id, userId, when)
    }
    return id
  })()
}

function createSimple(tenantId: string, userId: string, kind: 'income' | 'expense', input: CreateSimpleInput): string {
  const db = getDb()
  const amount = Math.round(input.amountMinor)
  if (!(amount > 0)) throw new Error('Amount must be greater than zero.')
  const branchId = defaultBranchId(tenantId)
  const when = input.recordDate ? new Date(input.recordDate).toISOString() : new Date().toISOString()
  const now = new Date().toISOString()
  const id = cuid()

  db.prepare(
    `INSERT INTO "Record" (id, tenantId, kind, recordNumber, branchId, contactId, categoryId, accountId, recordDate,
                           subtotalMinor, amountMinor, currency, paymentStatus, approvalStatus, description,
                           createdById, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'XAF', 'paid', 'none', ?, ?, ?, ?, 'dirty')`
  ).run(
    id,
    tenantId,
    kind,
    nextRecordNumber(tenantId, kind),
    branchId,
    input.contactId ?? null,
    input.categoryId ?? null,
    input.accountId ?? null,
    when,
    amount,
    amount,
    input.description ?? null,
    userId,
    now,
    now
  )
  return id
}

export const createIncome = (t: string, u: string, i: CreateSimpleInput) => createSimple(t, u, 'income', i)
export const createExpense = (t: string, u: string, i: CreateSimpleInput) => createSimple(t, u, 'expense', i)

export function listRecords(
  tenantId: string,
  opts: { kind?: string; limit?: number; offset?: number } = {}
): RecordListItem[] {
  const db = getDb()
  const limit = Math.min(opts.limit ?? 100, 500)
  const offset = opts.offset ?? 0
  const kindClause = opts.kind ? 'AND r.kind = @kind' : ''
  return db
    .prepare(
      `SELECT r.id, r.kind, r.recordNumber, r.amountMinor, r.paymentStatus, r.description, r.recordDate,
              c.name AS contactName
         FROM "Record" r
         LEFT JOIN Contact c ON c.id = r.contactId
        WHERE r.tenantId = @tenantId AND r.deletedAt IS NULL ${kindClause}
        ORDER BY r.recordDate DESC, r.createdAt DESC
        LIMIT @limit OFFSET @offset`
    )
    .all({ tenantId, kind: opts.kind, limit, offset }) as RecordListItem[]
}

export function getRecordDetail(tenantId: string, id: string): RecordDetailDTO | null {
  const db = getDb()
  const rec = db
    .prepare(
      `SELECT r.id, r.kind, r.recordNumber, r.amountMinor, r.subtotalMinor, r.discountMinor, r.currency,
              r.paymentStatus, r.description, r.recordDate, c.name AS contactName
         FROM "Record" r
         LEFT JOIN Contact c ON c.id = r.contactId
        WHERE r.tenantId = ? AND r.id = ? AND r.deletedAt IS NULL`
    )
    .get(tenantId, id) as Omit<RecordDetailDTO, 'items'> | undefined
  if (!rec) return null
  const items = db
    .prepare(
      `SELECT id, productId, name, quantity, unitPriceMinor, lineTotalMinor FROM RecordItem WHERE recordId = ?`
    )
    .all(id) as RecordItemDTO[]
  return { ...rec, items }
}
