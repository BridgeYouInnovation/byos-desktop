import { getDb } from '../db/connection'
import { cuid } from '../id'
import type { ContactDTO, CreateContactInput } from '@core/dto'

export function listContacts(tenantId: string, type?: string): ContactDTO[] {
  const db = getDb()
  const clause = type ? 'AND contactType = @type' : ''
  return db
    .prepare(
      `SELECT id, contactType, name, phone, email, balanceMinor, notes
         FROM Contact WHERE tenantId = @tenantId AND deletedAt IS NULL ${clause}
        ORDER BY name`
    )
    .all({ tenantId, type }) as ContactDTO[]
}

export function createContact(tenantId: string, input: CreateContactInput): string {
  const db = getDb()
  if (!input.name?.trim()) throw new Error('Name is required.')
  const now = new Date().toISOString()
  const id = cuid()
  db.prepare(
    `INSERT INTO Contact (id, tenantId, contactType, name, phone, email, notes, balanceMinor, createdAt, updatedAt, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'dirty')`
  ).run(
    id,
    tenantId,
    input.contactType || 'customer',
    input.name.trim(),
    input.phone ?? null,
    input.email ?? null,
    input.notes ?? null,
    now,
    now
  )
  return id
}
