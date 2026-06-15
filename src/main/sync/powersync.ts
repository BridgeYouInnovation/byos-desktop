import { app } from 'electron'
import { PowerSyncDatabase } from '@powersync/node'
import { AppSchema } from './schema'
import { ByosConnector } from './connector'

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
