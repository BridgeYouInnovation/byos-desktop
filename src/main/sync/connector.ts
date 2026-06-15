import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/node'
import { BACKEND_URL } from './config'
import { getSessionToken } from '../prefs'

// Bridges PowerSync to the BYOS backend.
//  • fetchCredentials → GET /api/sync/token (bearer = desktop-session token)
//    returns a short-lived PowerSync JWT + the instance URL (endpoint).
//  • uploadData → POST the local CRUD queue to /api/sync/upload, which applies
//    it to Postgres (tenant-scoped) via Prisma. On success the batch is cleared;
//    throwing makes PowerSync retry the whole batch later.
export class ByosConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const session = getSessionToken()
    if (!session) return null // not logged in online yet → stay offline

    const res = await fetch(`${BACKEND_URL}/api/sync/token`, {
      headers: { Authorization: `Bearer ${session}` }
    })
    if (res.status === 401) return null // session expired → caller must re-login online
    if (!res.ok) throw new Error(`token endpoint ${res.status}`)

    const { token, powersync_url } = (await res.json()) as { token: string; powersync_url: string }
    return { endpoint: powersync_url, token }
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch()
    if (!batch) return

    const session = getSessionToken()
    if (!session) return // can't upload without a session; PowerSync retries

    const entries = batch.crud.map((op) => ({
      table: op.table,
      op: op.op,
      id: op.id,
      data: op.opData
    }))

    const res = await fetch(`${BACKEND_URL}/api/sync/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session}` },
      body: JSON.stringify({ batch: entries })
    })
    if (!res.ok) {
      // Non-2xx → throw so PowerSync keeps the queue and retries.
      throw new Error(`upload ${res.status}: ${await res.text()}`)
    }
    await batch.complete()
  }
}
