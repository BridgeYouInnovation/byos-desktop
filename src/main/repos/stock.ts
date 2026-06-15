import { getPowerSync } from '../sync/powersync'
import { cuid } from '../id'
import { defaultBranchId } from './refs'
import type { ProductDTO, CreateProductInput, StockMovementDTO, AdjustStockInput } from '@core/dto'

export async function listProducts(tenantId: string): Promise<ProductDTO[]> {
  const rows = await getPowerSync().getAll<Omit<ProductDTO, 'trackStock'> & { trackStock: number }>(
    `SELECT p.id, p.name, cat.name AS categoryName, p.unit, p.costPriceMinor, p.sellingPriceMinor,
            p.reorderLevel, p.trackStock, p.status,
            COALESCE((SELECT SUM(b.quantity) FROM "InventoryBalance" b WHERE b.productId = p.id), 0) AS quantity
       FROM "Product" p
       LEFT JOIN "RecordCategory" cat ON cat.id = p.categoryId
      WHERE p.tenantId = ? AND p.deletedAt IS NULL
      ORDER BY p.name`,
    [tenantId]
  )
  return rows.map((r) => ({ ...r, trackStock: !!r.trackStock }))
}

export async function createProduct(tenantId: string, userId: string, input: CreateProductInput): Promise<string> {
  if (!input.name?.trim()) throw new Error('Product name is required.')
  const ps = getPowerSync()
  const branchId = await defaultBranchId(tenantId)
  const now = new Date().toISOString()
  const id = cuid()
  const trackStock = input.trackStock === false ? 0 : 1
  const opening = Math.max(0, input.openingQty ?? 0)

  await ps.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO "Product" (id, tenantId, categoryId, name, unit, costPriceMinor, sellingPriceMinor,
                              reorderLevel, trackStock, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, tenantId, input.categoryId ?? null, input.name.trim(), input.unit || 'unit', input.costPriceMinor ?? null, input.sellingPriceMinor ?? null, input.reorderLevel ?? 0, trackStock, now, now]
    )
    if (trackStock && opening > 0 && branchId) {
      await tx.execute(
        `INSERT INTO "InventoryMovement" (id, tenantId, productId, branchId, movementType, quantity, unitCostMinor, reason, movementDate, createdById, createdAt)
         VALUES (?, ?, ?, ?, 'opening', ?, ?, 'Opening stock', ?, ?, ?)`,
        [cuid(), tenantId, id, branchId, opening, input.costPriceMinor ?? null, now, userId, now]
      )
      await tx.execute(
        'INSERT INTO "InventoryBalance" (id, tenantId, productId, branchId, quantity) VALUES (?, ?, ?, ?, ?)',
        [cuid(), tenantId, id, branchId, opening]
      )
    }
  })
  return id
}

// Append a movement + recompute the balance. Positive (stock_in) adds; rest subtract.
export async function adjustStock(tenantId: string, userId: string, input: AdjustStockInput): Promise<void> {
  const qty = Math.abs(input.quantity)
  if (!(qty > 0)) throw new Error('Quantity must be greater than zero.')
  const ps = getPowerSync()
  const branchId = await defaultBranchId(tenantId)
  if (!branchId) throw new Error('No branch configured.')
  const signed = input.movementType === 'stock_in' ? qty : -qty
  const now = new Date().toISOString()

  await ps.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO "InventoryMovement" (id, tenantId, productId, branchId, movementType, quantity, reason, movementDate, createdById, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cuid(), tenantId, input.productId, branchId, input.movementType, qty, input.reason ?? null, now, userId, now]
    )
    const bal = (
      await tx.getAll<{ id: string; quantity: number }>(
        'SELECT id, quantity FROM "InventoryBalance" WHERE productId = ? AND branchId = ?',
        [input.productId, branchId]
      )
    )[0]
    if (bal) {
      await tx.execute('UPDATE "InventoryBalance" SET quantity = ? WHERE id = ?', [bal.quantity + signed, bal.id])
    } else {
      await tx.execute(
        'INSERT INTO "InventoryBalance" (id, tenantId, productId, branchId, quantity) VALUES (?, ?, ?, ?, ?)',
        [cuid(), tenantId, input.productId, branchId, signed]
      )
    }
  })
}

export async function listMovements(tenantId: string, productId?: string): Promise<StockMovementDTO[]> {
  const params: unknown[] = [tenantId]
  let clause = ''
  if (productId) {
    clause = 'AND m.productId = ?'
    params.push(productId)
  }
  return getPowerSync().getAll<StockMovementDTO>(
    `SELECT m.id, p.name AS productName, m.movementType, m.quantity, m.reason, m.movementDate
       FROM "InventoryMovement" m
       JOIN "Product" p ON p.id = m.productId
      WHERE m.tenantId = ? ${clause}
      ORDER BY m.movementDate DESC, m.createdAt DESC
      LIMIT 200`,
    params as never[]
  )
}
