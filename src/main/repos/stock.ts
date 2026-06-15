import { getDb } from '../db/connection'
import { cuid } from '../id'
import { defaultBranchId } from './refs'
import type { ProductDTO, CreateProductInput, StockMovementDTO, AdjustStockInput } from '@core/dto'

export function listProducts(tenantId: string): ProductDTO[] {
  return getDb()
    .prepare(
      `SELECT p.id, p.name, cat.name AS categoryName, p.unit, p.costPriceMinor, p.sellingPriceMinor,
              p.reorderLevel, p.trackStock, p.status,
              COALESCE((SELECT SUM(b.quantity) FROM InventoryBalance b WHERE b.productId = p.id), 0) AS quantity
         FROM Product p
         LEFT JOIN RecordCategory cat ON cat.id = p.categoryId
        WHERE p.tenantId = ? AND p.deletedAt IS NULL
        ORDER BY p.name`
    )
    .all(tenantId)
    .map((r) => ({ ...(r as ProductDTO), trackStock: !!(r as { trackStock: number }).trackStock })) as ProductDTO[]
}

export function createProduct(tenantId: string, userId: string, input: CreateProductInput): string {
  const db = getDb()
  if (!input.name?.trim()) throw new Error('Product name is required.')
  const branchId = defaultBranchId(tenantId)
  const now = new Date().toISOString()
  const id = cuid()
  const trackStock = input.trackStock === false ? 0 : 1

  return db.transaction(() => {
    db.prepare(
      `INSERT INTO Product (id, tenantId, categoryId, name, unit, costPriceMinor, sellingPriceMinor,
                            reorderLevel, trackStock, status, createdAt, updatedAt, syncState)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 'dirty')`
    ).run(
      id,
      tenantId,
      input.categoryId ?? null,
      input.name.trim(),
      input.unit || 'unit',
      input.costPriceMinor ?? null,
      input.sellingPriceMinor ?? null,
      input.reorderLevel ?? 0,
      trackStock,
      now,
      now
    )

    const opening = Math.max(0, input.openingQty ?? 0)
    if (trackStock && opening > 0 && branchId) {
      db.prepare(
        `INSERT INTO InventoryMovement (id, tenantId, productId, branchId, movementType, quantity, unitCostMinor, reason, movementDate, createdById, createdAt, syncState)
         VALUES (?, ?, ?, ?, 'opening', ?, ?, 'Opening stock', ?, ?, ?, 'dirty')`
      ).run(cuid(), tenantId, id, branchId, opening, input.costPriceMinor ?? null, now, userId, now)
      db.prepare(
        'INSERT INTO InventoryBalance (id, tenantId, productId, branchId, quantity, syncState) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(cuid(), tenantId, id, branchId, opening, 'dirty')
    }
    return id
  })()
}

// Adjust stock by appending a movement and recomputing the balance. Positive
// movements (stock_in) add; the rest subtract.
export function adjustStock(tenantId: string, userId: string, input: AdjustStockInput): void {
  const db = getDb()
  const qty = Math.abs(input.quantity)
  if (!(qty > 0)) throw new Error('Quantity must be greater than zero.')
  const branchId = defaultBranchId(tenantId)
  if (!branchId) throw new Error('No branch configured.')
  const signed = input.movementType === 'stock_in' ? qty : -qty
  const now = new Date().toISOString()

  db.transaction(() => {
    db.prepare(
      `INSERT INTO InventoryMovement (id, tenantId, productId, branchId, movementType, quantity, reason, movementDate, createdById, createdAt, syncState)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dirty')`
    ).run(cuid(), tenantId, input.productId, branchId, input.movementType, qty, input.reason ?? null, now, userId, now)

    const bal = db
      .prepare('SELECT id, quantity FROM InventoryBalance WHERE productId = ? AND branchId = ?')
      .get(input.productId, branchId) as { id: string; quantity: number } | undefined
    if (bal) {
      db.prepare('UPDATE InventoryBalance SET quantity = ?, syncState = ? WHERE id = ?').run(
        bal.quantity + signed,
        'dirty',
        bal.id
      )
    } else {
      db.prepare(
        'INSERT INTO InventoryBalance (id, tenantId, productId, branchId, quantity, syncState) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(cuid(), tenantId, input.productId, branchId, signed, 'dirty')
    }
  })()
}

export function listMovements(tenantId: string, productId?: string): StockMovementDTO[] {
  const db = getDb()
  const clause = productId ? 'AND m.productId = @productId' : ''
  return db
    .prepare(
      `SELECT m.id, p.name AS productName, m.movementType, m.quantity, m.reason, m.movementDate
         FROM InventoryMovement m
         JOIN Product p ON p.id = m.productId
        WHERE m.tenantId = @tenantId ${clause}
        ORDER BY m.movementDate DESC, m.createdAt DESC
        LIMIT 200`
    )
    .all({ tenantId, productId }) as StockMovementDTO[]
}
