import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { migrate } from './migrate'

let db: Database.Database | null = null

// The local SQLite file — the offline source of truth. Lives in the OS app-data
// dir so it survives app updates. (Phase 5: wrap with SQLCipher for at-rest
// encryption of business financials.)
export function getDb(): Database.Database {
  if (db) return db
  const file = join(app.getPath('userData'), 'byos.db')
  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}
