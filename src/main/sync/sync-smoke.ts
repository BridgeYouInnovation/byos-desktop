import { onlineLogin } from './online-auth'
import { getPowerSync } from './powersync'
import { cuid } from '../id'

// Dev-only end-to-end SYNC test (BYOS_SYNC_SMOKE=1) against the live web backend
// + PowerSync Cloud + Supabase. Proves: online login → PowerSync connects →
// initial sync pulls the tenant's rows down → a local insert uploads back to
// Postgres. Run with an isolated temp userData (see index.ts).
//
// Requires: web dev server running (BYOS_BACKEND_URL, default localhost:3000),
// Sync Streams deployed, and valid demo credentials.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms))
  ])
}

export async function runSyncSmoke(): Promise<void> {
  const out: Record<string, unknown> = {}
  const email = process.env.BYOS_TEST_EMAIL || 'owner@demo.cm'
  const password = process.env.BYOS_TEST_PASSWORD || 'Owner@12345'

  try {
    const login = await onlineLogin(email, password)
    if ('error' in login) {
      console.log('BYOS_SYNC_RESULT ' + JSON.stringify({ loginError: login.error }))
      return
    }
    out.login = { user: login.user.fullName }

    const ps = getPowerSync()
    await withTimeout(ps.waitForFirstSync(), 60_000, 'first sync')
    out.firstSyncDone = true

    const count = async (t: string) =>
      (await ps.get<{ c: number }>(`SELECT COUNT(*) AS c FROM "${t}"`)).c
    out.pulled = {
      Tenant: await count('Tenant'),
      Contact: await count('Contact'),
      Product: await count('Product'),
      Record: await count('Record'),
      RecordItem: await count('RecordItem')
    }

    const tenant = await ps.get<{ id: string; businessName: string }>(
      'SELECT id, businessName FROM "Tenant" LIMIT 1'
    )
    out.tenant = tenant.businessName

    // Insert a record locally → PowerSync should upload it to Postgres.
    const id = cuid()
    const num = `INC-SYNC-${Date.now().toString().slice(-6)}`
    await ps.execute(
      `INSERT INTO "Record" (id, tenantId, kind, recordNumber, recordDate, subtotalMinor, amountMinor, currency, paymentStatus, approvalStatus, description, isVoid, createdAt, updatedAt)
       VALUES (?, ?, 'income', ?, ?, 0, 12345, 'XAF', 'paid', 'none', 'sync smoke test', 0, ?, ?)`,
      [id, tenant.id, num, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]
    )
    out.inserted = { id, num }

    // Wait for the upload queue to drain.
    let pending = 1
    for (let i = 0; i < 30 && pending > 0; i++) {
      const batch = await ps.getCrudBatch()
      pending = batch ? batch.crud.length : 0
      if (pending === 0) break
      await new Promise((r) => setTimeout(r, 1000))
    }
    out.uploadQueueDrained = pending === 0
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e)
  }

  console.log('BYOS_SYNC_RESULT ' + JSON.stringify(out, null, 2))
}
