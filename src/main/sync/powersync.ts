import { app } from 'electron'
import { PowerSyncDatabase } from '@powersync/node'
import { AppSchema } from './schema'
import { ByosConnector } from './connector'
import type { SyncStatusDTO } from '@core/dto'

export type { SyncStatusDTO }

// The PowerSync-managed local SQLite — the offline source of truth, replacing
// the hand-rolled better-sqlite3 DB. Lives in the app-data dir; survives updates.
let db: PowerSyncDatabase | null = null
let connected = false

export function getPowerSync(): PowerSyncDatabase {
  if (db) return db
  db = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'byos-powersync.db', dbLocation: app.getPath('userData') }
  })
  return db
}

// Begin streaming this device's tenant data + flushing local writes. Safe to
// call when offline — PowerSync simply retries fetchCredentials until online.
export async function connectSync(): Promise<void> {
  const ps = getPowerSync()
  if (connected) return
  await ps.connect(new ByosConnector())
  connected = true
}

export async function disconnectSync(): Promise<void> {
  if (db && connected) {
    await db.disconnect()
    connected = false
  }
}

export async function closePowerSync(): Promise<void> {
  await disconnectSync()
  await db?.close()
  db = null
}

// Wipe the local synced data (e.g. on account switch) so a device never holds
// another tenant's rows. local-only tables (local_auth) are cleared separately.
export async function clearSyncedData(): Promise<void> {
  if (db) await db.disconnectAndClear()
  connected = false
}

export async function getSyncStatus(): Promise<SyncStatusDTO> {
  if (!db) {
    return { connected: false, connecting: false, lastSyncedAt: null, pending: 0, downloading: false, uploading: false }
  }
  const s = db.currentStatus
  let pending = 0
  try {
    pending = (await db.getUploadQueueStats(false)).count
  } catch {
    /* queue not ready */
  }
  return {
    connected: !!s.connected,
    connecting: !!s.connecting,
    lastSyncedAt: s.lastSyncedAt ? s.lastSyncedAt.toISOString() : null,
    pending,
    downloading: !!s.dataFlowStatus?.downloading,
    uploading: !!s.dataFlowStatus?.uploading
  }
}

// "Sync now": ensure we're connected (PowerSync then flushes the upload queue and
// pulls changes automatically). No-op-safe when offline (it keeps retrying).
export async function triggerSync(): Promise<void> {
  await connectSync()
}
