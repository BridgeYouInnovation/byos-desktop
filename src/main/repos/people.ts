import { getPowerSync } from '../sync/powersync'
import { cuid } from '../id'
import type { ContactDTO, CreateContactInput } from '@core/dto'

export async function listContacts(tenantId: string, type?: string): Promise<ContactDTO[]> {
  const params: unknown[] = [tenantId]
  let clause = ''
  if (type) {
    clause = 'AND contactType = ?'
    params.push(type)
  }
  return getPowerSync().getAll<ContactDTO>(
    `SELECT id, contactType, name, phone, email, balanceMinor, notes
       FROM "Contact" WHERE tenantId = ? AND deletedAt IS NULL ${clause}
      ORDER BY name`,
    params as never[]
  )
}

export async function createContact(tenantId: string, input: CreateContactInput): Promise<string> {
  if (!input.name?.trim()) throw new Error('Name is required.')
  const now = new Date().toISOString()
  const id = cuid()
  await getPowerSync().execute(
    `INSERT INTO "Contact" (id, tenantId, contactType, name, phone, email, notes, balanceMinor, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, tenantId, input.contactType || 'customer', input.name.trim(), input.phone ?? null, input.email ?? null, input.notes ?? null, now, now]
  )
  return id
}
