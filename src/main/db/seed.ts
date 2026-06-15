import type Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { BUSINESS_TEMPLATES, getTemplate, contactTypeForTemplate } from '@core/templates'
import { ROLE_PRESETS } from '@core/permissions'
import { slugify } from '@core/format'
import { addDays, addYears } from '@core/subscription'
import { cuid } from '../id'

// Seeds the local DB on first launch so the offline workflow is fully usable
// before any cloud sync exists. Mirrors web/prisma/seed.ts + provisionTenant():
// demo owner (owner@demo.cm / Owner@12345) running an active retail business
// "Bonamoussadi Mini Market", with sample stock, contacts and records.
//
// Once Phase 3 lands, this bootstrap is replaced by an online first-login pull
// from Supabase; for now it is the device's starting dataset.

const DEFAULT_ACCOUNTS = [
  { name: 'Cash', accountType: 'cash', isDefault: 1 },
  { name: 'MTN Mobile Money', accountType: 'momo', isDefault: 0 },
  { name: 'Orange Money', accountType: 'orange', isDefault: 0 },
  { name: 'Bank Transfer', accountType: 'bank', isDefault: 0 }
]

const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number) => addDays(new Date(), -n)
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export function seedIfEmpty(db: Database.Database): void {
  const seeded = db.prepare('SELECT 1 FROM Tenant LIMIT 1').get()
  if (seeded) return

  const tx = db.transaction(() => {
    const now = iso(new Date())

    // ── Business templates ──────────────────────────────────────────────────
    const insTemplate = db.prepare(
      `INSERT INTO BusinessTemplate
        (id, key, name, description, peopleLabel, salesLabel, defaultModulesJson,
         incomeCategoriesJson, expenseCategoriesJson, productCategoriesJson, dashboardFocusJson, createdAt)
       VALUES (@id, @key, @name, @description, @peopleLabel, @salesLabel, @defaultModulesJson,
               @incomeCategoriesJson, @expenseCategoriesJson, @productCategoriesJson, @dashboardFocusJson, @createdAt)`
    )
    for (const t of BUSINESS_TEMPLATES) {
      insTemplate.run({
        id: cuid(),
        key: t.key,
        name: t.name,
        description: t.description,
        peopleLabel: t.peopleLabel,
        salesLabel: t.salesLabel,
        defaultModulesJson: JSON.stringify(t.defaultModules),
        incomeCategoriesJson: JSON.stringify(t.incomeCategories),
        expenseCategoriesJson: JSON.stringify(t.expenseCategories),
        productCategoriesJson: JSON.stringify(t.productCategories),
        dashboardFocusJson: JSON.stringify(t.dashboardFocus),
        createdAt: now
      })
    }

    // ── Demo owner ──────────────────────────────────────────────────────────
    const ownerId = cuid()
    db.prepare(
      `INSERT INTO User (id, fullName, email, phone, passwordHash, status, emailVerifiedAt, isPlatformAdmin, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'active', ?, 0, ?, ?)`
    ).run(
      ownerId,
      'Marie Tabi',
      'owner@demo.cm',
      '+237670000001',
      bcrypt.hashSync('Owner@12345', 12),
      now,
      now,
      now
    )

    // ── Tenant (retail) ───────────────────────────────────────────────────────
    const industryType = 'retail'
    const template = getTemplate(industryType)
    const tenantId = cuid()
    const slug = slugify('Bonamoussadi Mini Market')
    db.prepare(
      `INSERT INTO Tenant (id, businessName, slug, industryType, city, phone, email, currency,
                           subscriptionStatus, setupStatus, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'XAF', 'active', 'completed', ?, ?)`
    ).run(
      tenantId,
      'Bonamoussadi Mini Market',
      slug,
      industryType,
      'Douala',
      '+237670000001',
      'owner@demo.cm',
      now,
      now
    )

    // ── Roles (from presets) ──────────────────────────────────────────────────
    const insRole = db.prepare(
      `INSERT INTO Role (id, tenantId, name, description, isSystemRole, permissionsJson, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`
    )
    const roleIds: Record<string, string> = {}
    for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
      const id = cuid()
      insRole.run(id, tenantId, preset.name, preset.description ?? null, JSON.stringify(preset.permissions), now, now)
      roleIds[key] = id
    }

    // ── Default branch ────────────────────────────────────────────────────────
    const branchId = cuid()
    db.prepare(
      `INSERT INTO Branch (id, tenantId, name, branchType, status, createdAt, updatedAt)
       VALUES (?, ?, 'Main Branch', 'main', 'active', ?, ?)`
    ).run(branchId, tenantId, now, now)

    // ── Owner membership ──────────────────────────────────────────────────────
    db.prepare(
      `INSERT INTO TenantUser (id, tenantId, userId, roleId, defaultBranchId, invitationStatus, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'accepted', 'active', ?, ?)`
    ).run(cuid(), tenantId, ownerId, roleIds['owner'], branchId, now, now)

    // ── Financial accounts ────────────────────────────────────────────────────
    const insAccount = db.prepare(
      `INSERT INTO FinancialAccount (id, tenantId, name, accountType, isDefault, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    for (const a of DEFAULT_ACCOUNTS) {
      insAccount.run(cuid(), tenantId, a.name, a.accountType, a.isDefault, now)
    }

    // ── Categories ────────────────────────────────────────────────────────────
    const insCat = db.prepare(
      `INSERT INTO RecordCategory (id, tenantId, name, kind, createdAt) VALUES (?, ?, ?, ?, ?)`
    )
    const productCatIds: string[] = []
    for (const name of template.incomeCategories) insCat.run(cuid(), tenantId, name, 'income', now)
    for (const name of template.expenseCategories) insCat.run(cuid(), tenantId, name, 'expense', now)
    for (const name of template.productCategories) {
      const id = cuid()
      insCat.run(id, tenantId, name, 'product', now)
      productCatIds.push(id)
    }

    // ── Modules ───────────────────────────────────────────────────────────────
    const insModule = db.prepare(
      `INSERT INTO TenantModule (id, tenantId, moduleKey, enabled) VALUES (?, ?, ?, 1)`
    )
    for (const key of template.defaultModules) insModule.run(cuid(), tenantId, key)

    // ── Subscription (active demo) ────────────────────────────────────────────
    const start = daysAgo(40)
    const end = addYears(start, 1)
    db.prepare(
      `INSERT INTO Subscription (id, tenantId, planName, priceMinor, currency, status, startDate,
                                 currentPeriodStart, currentPeriodEnd, gracePeriodEnd, createdAt, updatedAt)
       VALUES (?, ?, 'BYOS Annual', 20000, 'XAF', 'active', ?, ?, ?, ?, ?, ?)`
    ).run(cuid(), tenantId, iso(start), iso(start), iso(end), iso(addDays(end, 14)), now, now)

    // ── Products + opening stock ──────────────────────────────────────────────
    const products = [
      { name: 'Rice 5kg', unit: 'bag', cost: 3500, price: 4500, qty: 40 },
      { name: 'Cooking Oil 1L', unit: 'bottle', cost: 1200, price: 1600, qty: 60 },
      { name: 'Sugar 1kg', unit: 'pack', cost: 700, price: 950, qty: 80 },
      { name: 'Soap (bar)', unit: 'unit', cost: 250, price: 400, qty: 120 },
      { name: 'Maggi cube (tin)', unit: 'tin', cost: 1800, price: 2200, qty: 25 },
      { name: 'Bottled Water 1.5L', unit: 'bottle', cost: 300, price: 500, qty: 200 }
    ]
    const insProduct = db.prepare(
      `INSERT INTO Product (id, tenantId, categoryId, name, unit, costPriceMinor, sellingPriceMinor,
                            reorderLevel, trackStock, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', ?, ?)`
    )
    const insBalance = db.prepare(
      `INSERT INTO InventoryBalance (id, tenantId, productId, branchId, quantity) VALUES (?, ?, ?, ?, ?)`
    )
    const insMovement = db.prepare(
      `INSERT INTO InventoryMovement (id, tenantId, productId, branchId, movementType, quantity, unitCostMinor, reason, movementDate, createdById, createdAt)
       VALUES (?, ?, ?, ?, 'opening', ?, ?, 'Opening stock', ?, ?, ?)`
    )
    const productList: { id: string; name: string; price: number }[] = []
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const id = cuid()
      const cat = productCatIds[i % Math.max(1, productCatIds.length)] ?? null
      insProduct.run(id, tenantId, cat, p.name, p.unit, p.cost, p.price, 10, now, now)
      insBalance.run(cuid(), tenantId, id, branchId, p.qty)
      insMovement.run(cuid(), tenantId, id, branchId, p.qty, p.cost, iso(daysAgo(35)), ownerId, iso(daysAgo(35)))
      productList.push({ id, name: p.name, price: p.price })
    }

    // ── Contacts ──────────────────────────────────────────────────────────────
    const contactType = contactTypeForTemplate(industryType)
    const insContact = db.prepare(
      `INSERT INTO Contact (id, tenantId, contactType, name, phone, balanceMinor, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
    )
    const customers = ['Jean-Paul N.', 'Aïcha M.', 'Boutique Étoile', 'Pascaline F.']
    const customerIds: string[] = []
    for (const name of customers) {
      const id = cuid()
      insContact.run(id, tenantId, contactType, name, `+2376${rand(70000000, 99999999)}`, now, now)
      customerIds.push(id)
    }
    insContact.run(cuid(), tenantId, 'supplier', 'Grossiste Douala SARL', `+2376${rand(70000000, 99999999)}`, now, now)

    // ── Records: sales over the last 30 days + a few expenses ──────────────────
    const insRecord = db.prepare(
      `INSERT INTO "Record" (id, tenantId, kind, recordNumber, branchId, contactId, categoryId, accountId,
                             recordDate, subtotalMinor, amountMinor, currency, paymentStatus, approvalStatus,
                             description, createdById, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, 'XAF', 'paid', 'none', ?, ?, ?, ?)`
    )
    const insItem = db.prepare(
      `INSERT INTO RecordItem (id, recordId, productId, name, quantity, unitPriceMinor, lineTotalMinor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const insSaleMovement = db.prepare(
      `INSERT INTO InventoryMovement (id, tenantId, productId, branchId, movementType, quantity, referenceType, referenceId, movementDate, createdById, createdAt)
       VALUES (?, ?, ?, ?, 'sale', ?, 'record', ?, ?, ?, ?)`
    )
    let saleNo = 0
    for (let s = 0; s < 14; s++) {
      const when = daysAgo(rand(0, 29))
      const recId = cuid()
      const lineCount = rand(1, 3)
      let total = 0
      const items: { productId: string; name: string; qty: number; price: number }[] = []
      for (let l = 0; l < lineCount; l++) {
        const p = productList[rand(0, productList.length - 1)]
        const qty = rand(1, 4)
        items.push({ productId: p.id, name: p.name, qty, price: p.price })
        total += qty * p.price
      }
      saleNo++
      insRecord.run(
        recId,
        tenantId,
        'sale',
        `SAL-${String(saleNo).padStart(4, '0')}`,
        branchId,
        customerIds[rand(0, customerIds.length - 1)],
        iso(when),
        total,
        total,
        `Counter sale`,
        ownerId,
        iso(when),
        iso(when)
      )
      for (const it of items) {
        insItem.run(cuid(), recId, it.productId, it.name, it.qty, it.price, it.qty * it.price)
        insSaleMovement.run(cuid(), tenantId, it.productId, branchId, it.qty, recId, iso(when), ownerId, iso(when))
      }
    }

    const expenses = [
      { desc: 'Shop rent', amount: 80000 },
      { desc: 'Electricity (ENEO)', amount: 18500 },
      { desc: 'Transport / restock', amount: 12000 },
      { desc: 'Cleaning supplies', amount: 4500 }
    ]
    let expNo = 0
    for (const e of expenses) {
      expNo++
      const when = daysAgo(rand(0, 29))
      insRecord.run(
        cuid(),
        tenantId,
        'expense',
        `EXP-${String(expNo).padStart(4, '0')}`,
        branchId,
        null,
        iso(when),
        e.amount,
        e.amount,
        e.desc,
        ownerId,
        iso(when),
        iso(when)
      )
    }
  })

  tx()
}
