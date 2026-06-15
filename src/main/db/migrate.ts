import type Database from 'better-sqlite3'
import schemaSql from './schema.sql?raw'
import { seedIfEmpty } from './seed'

const SCHEMA_VERSION = 1

// Apply the schema idempotently (all CREATE ... IF NOT EXISTS), track a version
// in _meta for future migrations, then seed demo data on a fresh database.
export function migrate(db: Database.Database): void {
  db.exec(schemaSql)

  const row = db.prepare('SELECT value FROM _meta WHERE key = ?').get('schema_version') as
    | { value: string }
    | undefined
  const current = row ? Number(row.value) : 0

  if (current < SCHEMA_VERSION) {
    db.prepare(
      'INSERT INTO _meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run('schema_version', String(SCHEMA_VERSION))
  }

  seedIfEmpty(db)
}
