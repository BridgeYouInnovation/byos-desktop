import { login, selectBusiness } from '../repos/auth'
import { getDashboardMetrics } from '../repos/dashboard'
import { listRecords } from '../repos/records'
import { listProducts } from '../repos/stock'
import { listContacts } from '../repos/people'
import { createIncome } from '../repos/records'
import { getSyncStatus } from './powersync'

// Dev-only end-to-end test of the MIGRATED stack (BYOS_SYNC_SMOKE=1) against the
// live web backend + PowerSync Cloud + Supabase. Exercises the real auth repo +
// PowerSync-backed repos: online login → context → reads (dashboard/records/
// products/contacts) → a write (createIncome) → upload drain.
//
// Requires: web dev server (BYOS_BACKEND_URL, default localhost:3000), Sync
// Streams deployed, and valid demo credentials.
export async function runSyncSmoke(): Promise<void> {
  const out: Record<string, unknown> = {}
  const email = process.env.BYOS_TEST_EMAIL || 'owner@demo.cm'
  const password = process.env.BYOS_TEST_PASSWORD || 'Owner@12345'

  try {
    let result = await login(email, password)
    if ('needsSelection' in result) {
      out.picker = { businesses: result.businesses.map((b) => b.businessName) }
      const pick = result.businesses[result.businesses.length - 1] // pick the LAST (e.g. church)
      out.picked = pick.businessName
      result = await selectBusiness(email, password, pick.id)
      out.afterSelect = 'ok' in result ? { ok: result.ok, error: 'error' in result ? result.error : null } : result
    }
    if (!('ok' in result) || !result.ok) {
      const err = 'needsSelection' in result ? 'needs_selection' : result.error
      console.log('BYOS_SYNC_RESULT ' + JSON.stringify({ ...out, loginError: err }))
      return
    }
    const ctx = result.context
    out.context = {
      user: ctx.user.fullName,
      business: ctx.tenant.businessName,
      status: ctx.tenant.subscriptionStatus,
      canCreate: ctx.access.canCreate,
      isOwner: ctx.isOwner,
      modules: ctx.modules
    }

    const [metrics, records, products, contacts] = await Promise.all([
      getDashboardMetrics(ctx.tenant.id),
      listRecords(ctx.tenant.id),
      listProducts(ctx.tenant.id),
      listContacts(ctx.tenant.id)
    ])
    out.reads = {
      monthInMinor: metrics.monthInMinor,
      records: records.length,
      products: products.length,
      contacts: contacts.length,
      sampleProduct: products[0] && { name: products[0].name, qty: products[0].quantity }
    }

    // Write through the migrated repo → PowerSync local + upload queue.
    const created = await createIncome(ctx.tenant.id, ctx.user.id, {
      amountMinor: 9876,
      description: 'migration smoke test'
    })
    const after = await listRecords(ctx.tenant.id, { kind: 'income' })
    out.write = { created: !!created, incomeCountAfter: after.length }

    // Wait for upload to drain.
    let pending = 1
    for (let i = 0; i < 30 && pending > 0; i++) {
      pending = (await getSyncStatus()).pending
      if (pending === 0) break
      await new Promise((r) => setTimeout(r, 1000))
    }
    const status = await getSyncStatus()
    out.sync = { connected: status.connected, lastSyncedAt: status.lastSyncedAt, pending: status.pending }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e)
  }

  console.log('BYOS_SYNC_RESULT ' + JSON.stringify(out, null, 2))
}
