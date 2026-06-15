import { login } from './repos/auth'
import { getTenantContext } from './repos/tenant'
import { getDashboardMetrics } from './repos/dashboard'
import { getWorkspaceRefs } from './repos/refs'
import { createSale, createIncome, createExpense, listRecords, getRecordDetail } from './repos/records'
import { listProducts, createProduct, adjustStock } from './repos/stock'
import { listContacts, createContact } from './repos/people'
import { getReportSummary } from './repos/reports'

// Dev-only end-to-end check of the local data path (run with BYOS_SMOKE=1
// against an isolated temp userData dir). Exercises seed → offline login →
// context/gating → Phase 2 writes (sale w/ stock movement, income, expense,
// product, contact, stock adjust) → reads (records, products, reports, metrics).
export async function runSmoke(): Promise<void> {
  const out: Record<string, unknown> = {}

  const good = await login('owner@demo.cm', 'Owner@12345')
  if (!good || !('user' in good)) {
    console.log('BYOS_SMOKE_RESULT ' + JSON.stringify({ loginFailed: good }))
    return
  }
  const ctx = getTenantContext(good.user)
  if (!ctx) {
    console.log('BYOS_SMOKE_RESULT ' + JSON.stringify({ noContext: true }))
    return
  }
  const tid = ctx.tenant.id
  const uid = good.user.id
  out.login = { name: good.user.fullName, business: ctx.tenant.businessName, canCreate: ctx.access.canCreate }

  const before = getDashboardMetrics(tid)

  // Create a contact + product, then a sale using that product.
  const contactId = createContact(tid, { contactType: 'customer', name: 'Smoke Test Customer' })
  const productId = createProduct(tid, uid, {
    name: 'Smoke Test Widget',
    unit: 'unit',
    costPriceMinor: 500,
    sellingPriceMinor: 800,
    reorderLevel: 5,
    openingQty: 20
  })
  const saleId = createSale(tid, uid, {
    contactId,
    items: [{ productId, name: 'Smoke Test Widget', quantity: 3, unitPriceMinor: 800 }]
  })
  const incomeId = createIncome(tid, uid, { amountMinor: 15000, description: 'Smoke misc income' })
  const expenseId = createExpense(tid, uid, { amountMinor: 4000, description: 'Smoke supplies' })
  adjustStock(tid, uid, { productId, movementType: 'stock_in', quantity: 10, reason: 'restock' })

  const saleDetail = getRecordDetail(tid, saleId)
  const product = listProducts(tid).find((p) => p.id === productId)
  const after = getDashboardMetrics(tid)
  const report = getReportSummary(
    tid,
    new Date(Date.now() - 86400000).toISOString(),
    new Date(Date.now() + 86400000).toISOString()
  )

  out.created = { saleId: !!saleId, incomeId: !!incomeId, expenseId: !!expenseId }
  out.sale = saleDetail && { number: saleDetail.recordNumber, total: saleDetail.amountMinor, items: saleDetail.items.length }
  out.product = product && { name: product.name, qtyAfterSaleAndRestock: product.quantity } // 20 - 3 + 10 = 27
  out.contactsCount = listContacts(tid).length
  out.recordsCount = listRecords(tid).length
  out.dashboardDelta = {
    todayInBefore: before.todayInMinor,
    todayInAfter: after.todayInMinor, // +2400 (sale) +15000 (income)
    todayOutAfter: after.todayOutMinor // +4000 (expense)
  }
  out.report = { in: report.totalInMinor, out: report.totalOutMinor, net: report.netMinor, topProducts: report.topProducts.length }

  console.log('BYOS_SMOKE_RESULT ' + JSON.stringify(out, null, 2))
}
