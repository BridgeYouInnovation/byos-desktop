import { Schema, Table, column } from '@powersync/node'

// PowerSync client schema — mirrors the synced Postgres tables (Prisma models).
// PowerSync injects the `id` text primary key automatically, so it is NOT
// declared here. Only text/integer/real column types exist: booleans are stored
// as integer (0/1) and dates/timestamps as ISO text — matching the web schema.
//
// These table/column names match the PascalCase Postgres names so the same SQL
// the Phase 2 repos use ports directly. The local-only `local_auth` table holds
// the logged-in user (incl. bcrypt hash) for offline re-login and is never synced.

const Tenant = new Table({
  businessName: column.text,
  slug: column.text,
  industryType: column.text,
  country: column.text,
  city: column.text,
  phone: column.text,
  email: column.text,
  logoUrl: column.text,
  themePrimary: column.text,
  themeSecondary: column.text,
  themeSuccess: column.text,
  themeSidebarMode: column.text,
  themeCardStyle: column.text,
  receiptHeader: column.text,
  currency: column.text,
  language: column.text,
  timezone: column.text,
  subscriptionStatus: column.text,
  setupStatus: column.text,
  createdAt: column.text,
  updatedAt: column.text,
  deletedAt: column.text
})

const TenantUser = new Table(
  {
    tenantId: column.text,
    userId: column.text,
    roleId: column.text,
    defaultBranchId: column.text,
    accessScope: column.text,
    invitationStatus: column.text,
    invitedEmail: column.text,
    status: column.text,
    createdAt: column.text,
    updatedAt: column.text
  },
  { indexes: { byUser: ['userId'] } }
)

const Role = new Table({
  tenantId: column.text,
  name: column.text,
  description: column.text,
  isSystemRole: column.integer,
  permissionsJson: column.text,
  createdAt: column.text,
  updatedAt: column.text
})

const Branch = new Table({
  tenantId: column.text,
  name: column.text,
  branchType: column.text,
  address: column.text,
  status: column.text,
  createdAt: column.text,
  updatedAt: column.text,
  deletedAt: column.text
})

const RecordCategory = new Table(
  {
    tenantId: column.text,
    name: column.text,
    kind: column.text,
    color: column.text,
    createdAt: column.text
  },
  { indexes: { byKind: ['tenantId', 'kind'] } }
)

const FinancialAccount = new Table({
  tenantId: column.text,
  name: column.text,
  accountType: column.text,
  balanceMinor: column.integer,
  isDefault: column.integer,
  createdAt: column.text
})

const TenantModule = new Table({
  tenantId: column.text,
  moduleKey: column.text,
  enabled: column.integer
})

const Contact = new Table(
  {
    tenantId: column.text,
    contactType: column.text,
    name: column.text,
    phone: column.text,
    email: column.text,
    balanceMinor: column.integer,
    notes: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text
  },
  { indexes: { byType: ['tenantId', 'contactType'] } }
)

const Product = new Table(
  {
    tenantId: column.text,
    categoryId: column.text,
    name: column.text,
    sku: column.text,
    barcode: column.text,
    unit: column.text,
    costPriceMinor: column.integer,
    sellingPriceMinor: column.integer,
    reorderLevel: column.real,
    trackStock: column.integer,
    status: column.text,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text
  },
  { indexes: { byStatus: ['tenantId', 'status'] } }
)

const InventoryBalance = new Table(
  {
    tenantId: column.text,
    productId: column.text,
    branchId: column.text,
    quantity: column.real
  },
  { indexes: { byProduct: ['productId'] } }
)

const InventoryMovement = new Table(
  {
    tenantId: column.text,
    productId: column.text,
    branchId: column.text,
    movementType: column.text,
    quantity: column.real,
    unitCostMinor: column.integer,
    referenceType: column.text,
    referenceId: column.text,
    reason: column.text,
    movementDate: column.text,
    createdById: column.text,
    createdAt: column.text
  },
  { indexes: { byProduct: ['tenantId', 'productId'] } }
)

const Record = new Table(
  {
    tenantId: column.text,
    kind: column.text,
    recordNumber: column.text,
    branchId: column.text,
    contactId: column.text,
    categoryId: column.text,
    accountId: column.text,
    fromAccountId: column.text,
    toAccountId: column.text,
    recordDate: column.text,
    subtotalMinor: column.integer,
    discountMinor: column.integer,
    taxMinor: column.integer,
    amountMinor: column.integer,
    currency: column.text,
    paymentStatus: column.text,
    approvalStatus: column.text,
    description: column.text,
    attachmentUrl: column.text,
    attachmentName: column.text,
    createdById: column.text,
    approvedById: column.text,
    approvedAt: column.text,
    rejectedReason: column.text,
    isVoid: column.integer,
    createdAt: column.text,
    updatedAt: column.text,
    deletedAt: column.text
  },
  { indexes: { byKind: ['tenantId', 'kind'] } }
)

const RecordItem = new Table(
  {
    recordId: column.text,
    productId: column.text,
    name: column.text,
    quantity: column.real,
    unitPriceMinor: column.integer,
    lineTotalMinor: column.integer
  },
  { indexes: { byRecord: ['recordId'] } }
)

const Subscription = new Table({
  tenantId: column.text,
  planName: column.text,
  priceMinor: column.integer,
  currency: column.text,
  status: column.text,
  startDate: column.text,
  currentPeriodStart: column.text,
  currentPeriodEnd: column.text,
  gracePeriodEnd: column.text,
  cancelledAt: column.text,
  createdAt: column.text,
  updatedAt: column.text
})

// Local-only: the signed-in user, for offline re-login. Never synced/uploaded.
const local_auth = new Table(
  {
    userId: column.text,
    fullName: column.text,
    email: column.text,
    phone: column.text,
    passwordHash: column.text,
    tenantId: column.text
  },
  { localOnly: true }
)

export const AppSchema = new Schema({
  Tenant,
  TenantUser,
  Role,
  Branch,
  RecordCategory,
  FinancialAccount,
  TenantModule,
  Contact,
  Product,
  InventoryBalance,
  InventoryMovement,
  Record,
  RecordItem,
  Subscription,
  local_auth
})

export type AppDatabase = (typeof AppSchema)['types']
