-- BYOS desktop local SQLite schema.
-- Mirrors web/prisma/schema.prisma (the SQLite-portable model). camelCase column
-- names match the Prisma fields so business logic ports 1:1. Booleans are 0/1,
-- dates are ISO-8601 TEXT, money is INTEGER minor units.
--
-- Sync-readiness (Phase 3): operational rows carry updatedAt, deletedAt (soft
-- delete) and syncState ('clean' | 'dirty'); primary keys are client-generated
-- cuid-style TEXT so offline-created rows never collide on sync.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS _meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── Identity & access ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS User (
  id              TEXT PRIMARY KEY,
  fullName        TEXT NOT NULL,
  email           TEXT UNIQUE,
  phone           TEXT UNIQUE,
  passwordHash    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  emailVerifiedAt TEXT,
  lastLoginAt     TEXT,
  isPlatformAdmin INTEGER NOT NULL DEFAULT 0,
  platformRole    TEXT,
  createdAt       TEXT NOT NULL,
  updatedAt       TEXT NOT NULL,
  syncState       TEXT NOT NULL DEFAULT 'clean'
);

CREATE TABLE IF NOT EXISTS Session (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL,
  jti       TEXT NOT NULL UNIQUE,
  userAgent TEXT,
  ip        TEXT,
  revokedAt TEXT,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_user ON Session(userId);

-- ── Tenant (business workspace) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Tenant (
  id                 TEXT PRIMARY KEY,
  businessName       TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  industryType       TEXT NOT NULL,
  country            TEXT NOT NULL DEFAULT 'Cameroon',
  city               TEXT,
  phone              TEXT,
  email              TEXT,
  logoUrl            TEXT,
  themePrimary       TEXT NOT NULL DEFAULT '#ff914d',
  themeSecondary     TEXT NOT NULL DEFAULT '#ffbd59',
  themeSuccess       TEXT NOT NULL DEFAULT '#5fb544',
  themeSidebarMode   TEXT NOT NULL DEFAULT 'dark',
  themeCardStyle     TEXT NOT NULL DEFAULT 'standard',
  receiptHeader      TEXT,
  currency           TEXT NOT NULL DEFAULT 'XAF',
  language           TEXT NOT NULL DEFAULT 'en',
  timezone           TEXT NOT NULL DEFAULT 'Africa/Douala',
  subscriptionStatus TEXT NOT NULL DEFAULT 'trial',
  setupStatus        TEXT NOT NULL DEFAULT 'not_started',
  createdAt          TEXT NOT NULL,
  updatedAt          TEXT NOT NULL,
  deletedAt          TEXT,
  syncState          TEXT NOT NULL DEFAULT 'clean'
);

CREATE TABLE IF NOT EXISTS Role (
  id              TEXT PRIMARY KEY,
  tenantId        TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  isSystemRole    INTEGER NOT NULL DEFAULT 0,
  permissionsJson TEXT NOT NULL DEFAULT '[]',
  createdAt       TEXT NOT NULL,
  updatedAt       TEXT NOT NULL,
  syncState       TEXT NOT NULL DEFAULT 'clean',
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_role_tenant ON Role(tenantId);

CREATE TABLE IF NOT EXISTS TenantUser (
  id               TEXT PRIMARY KEY,
  tenantId         TEXT NOT NULL,
  userId           TEXT NOT NULL,
  roleId           TEXT,
  defaultBranchId  TEXT,
  accessScope      TEXT NOT NULL DEFAULT 'all_branches',
  invitationStatus TEXT NOT NULL DEFAULT 'accepted',
  invitedEmail     TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  createdAt        TEXT NOT NULL,
  updatedAt        TEXT NOT NULL,
  syncState        TEXT NOT NULL DEFAULT 'clean',
  UNIQUE (tenantId, userId),
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES Role(id)
);
CREATE INDEX IF NOT EXISTS idx_tenantuser_user ON TenantUser(userId);

-- ── Business configuration ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Branch (
  id         TEXT PRIMARY KEY,
  tenantId   TEXT NOT NULL,
  name       TEXT NOT NULL,
  branchType TEXT,
  address    TEXT,
  status     TEXT NOT NULL DEFAULT 'active',
  createdAt  TEXT NOT NULL,
  updatedAt  TEXT NOT NULL,
  deletedAt  TEXT,
  syncState  TEXT NOT NULL DEFAULT 'clean',
  UNIQUE (tenantId, name),
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS RecordCategory (
  id        TEXT PRIMARY KEY,
  tenantId  TEXT NOT NULL,
  name      TEXT NOT NULL,
  kind      TEXT NOT NULL,
  color     TEXT,
  createdAt TEXT NOT NULL,
  syncState TEXT NOT NULL DEFAULT 'clean',
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_category_tenant_kind ON RecordCategory(tenantId, kind);

CREATE TABLE IF NOT EXISTS FinancialAccount (
  id           TEXT PRIMARY KEY,
  tenantId     TEXT NOT NULL,
  name         TEXT NOT NULL,
  accountType  TEXT NOT NULL,
  balanceMinor INTEGER NOT NULL DEFAULT 0,
  isDefault    INTEGER NOT NULL DEFAULT 0,
  createdAt    TEXT NOT NULL,
  syncState    TEXT NOT NULL DEFAULT 'clean',
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_account_tenant ON FinancialAccount(tenantId);

CREATE TABLE IF NOT EXISTS TenantModule (
  id        TEXT PRIMARY KEY,
  tenantId  TEXT NOT NULL,
  moduleKey TEXT NOT NULL,
  enabled   INTEGER NOT NULL DEFAULT 1,
  syncState TEXT NOT NULL DEFAULT 'clean',
  UNIQUE (tenantId, moduleKey),
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);

-- ── People ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Contact (
  id           TEXT PRIMARY KEY,
  tenantId     TEXT NOT NULL,
  contactType  TEXT NOT NULL,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  balanceMinor INTEGER NOT NULL DEFAULT 0,
  notes        TEXT,
  createdAt    TEXT NOT NULL,
  updatedAt    TEXT NOT NULL,
  deletedAt    TEXT,
  syncState    TEXT NOT NULL DEFAULT 'clean',
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_contact_tenant_type ON Contact(tenantId, contactType);

-- ── Stock ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Product (
  id                TEXT PRIMARY KEY,
  tenantId          TEXT NOT NULL,
  categoryId        TEXT,
  name              TEXT NOT NULL,
  sku               TEXT,
  barcode           TEXT,
  unit              TEXT NOT NULL DEFAULT 'unit',
  costPriceMinor    INTEGER,
  sellingPriceMinor INTEGER,
  reorderLevel      REAL NOT NULL DEFAULT 0,
  trackStock        INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'active',
  createdAt         TEXT NOT NULL,
  updatedAt         TEXT NOT NULL,
  deletedAt         TEXT,
  syncState         TEXT NOT NULL DEFAULT 'clean',
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_tenant_status ON Product(tenantId, status);

CREATE TABLE IF NOT EXISTS InventoryBalance (
  id        TEXT PRIMARY KEY,
  tenantId  TEXT NOT NULL,
  productId TEXT NOT NULL,
  branchId  TEXT NOT NULL,
  quantity  REAL NOT NULL DEFAULT 0,
  syncState TEXT NOT NULL DEFAULT 'clean',
  UNIQUE (productId, branchId),
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_balance_tenant ON InventoryBalance(tenantId);

CREATE TABLE IF NOT EXISTS InventoryMovement (
  id            TEXT PRIMARY KEY,
  tenantId      TEXT NOT NULL,
  productId     TEXT NOT NULL,
  branchId      TEXT NOT NULL,
  movementType  TEXT NOT NULL,
  quantity      REAL NOT NULL,
  unitCostMinor INTEGER,
  referenceType TEXT,
  referenceId   TEXT,
  reason        TEXT,
  movementDate  TEXT NOT NULL,
  createdById   TEXT,
  createdAt     TEXT NOT NULL,
  syncState     TEXT NOT NULL DEFAULT 'clean',
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_movement_tenant_product ON InventoryMovement(tenantId, productId, movementDate);

-- ── Records (sale / income / expense / transfer) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "Record" (
  id            TEXT PRIMARY KEY,
  tenantId      TEXT NOT NULL,
  kind          TEXT NOT NULL,
  recordNumber  TEXT NOT NULL,
  branchId      TEXT,
  contactId     TEXT,
  categoryId    TEXT,
  accountId     TEXT,
  fromAccountId TEXT,
  toAccountId   TEXT,
  recordDate    TEXT NOT NULL,
  subtotalMinor INTEGER NOT NULL DEFAULT 0,
  discountMinor INTEGER NOT NULL DEFAULT 0,
  taxMinor      INTEGER NOT NULL DEFAULT 0,
  amountMinor   INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'XAF',
  paymentStatus TEXT NOT NULL DEFAULT 'paid',
  approvalStatus TEXT NOT NULL DEFAULT 'none',
  description   TEXT,
  attachmentUrl TEXT,
  attachmentName TEXT,
  createdById   TEXT,
  approvedById  TEXT,
  approvedAt    TEXT,
  rejectedReason TEXT,
  isVoid        INTEGER NOT NULL DEFAULT 0,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL,
  deletedAt     TEXT,
  syncState     TEXT NOT NULL DEFAULT 'clean',
  UNIQUE (tenantId, recordNumber),
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (contactId) REFERENCES Contact(id)
);
CREATE INDEX IF NOT EXISTS idx_record_tenant_kind_date ON "Record"(tenantId, kind, recordDate);

CREATE TABLE IF NOT EXISTS RecordItem (
  id             TEXT PRIMARY KEY,
  recordId       TEXT NOT NULL,
  productId      TEXT,
  name           TEXT NOT NULL,
  quantity       REAL NOT NULL DEFAULT 1,
  unitPriceMinor INTEGER NOT NULL DEFAULT 0,
  lineTotalMinor INTEGER NOT NULL DEFAULT 0,
  syncState      TEXT NOT NULL DEFAULT 'clean',
  FOREIGN KEY (recordId) REFERENCES "Record"(id) ON DELETE CASCADE
);

-- ── Subscription ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Subscription (
  id                 TEXT PRIMARY KEY,
  tenantId           TEXT NOT NULL,
  planName           TEXT NOT NULL DEFAULT 'BYOS Annual',
  priceMinor         INTEGER NOT NULL DEFAULT 20000,
  currency           TEXT NOT NULL DEFAULT 'XAF',
  status             TEXT NOT NULL DEFAULT 'pending',
  startDate          TEXT,
  currentPeriodStart TEXT,
  currentPeriodEnd   TEXT,
  gracePeriodEnd     TEXT,
  cancelledAt        TEXT,
  createdAt          TEXT NOT NULL,
  updatedAt          TEXT NOT NULL,
  syncState          TEXT NOT NULL DEFAULT 'clean',
  FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_subscription_tenant ON Subscription(tenantId);

-- ── Cross-cutting ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS BusinessTemplate (
  id                    TEXT PRIMARY KEY,
  key                   TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL,
  peopleLabel           TEXT NOT NULL DEFAULT 'Customers',
  salesLabel            TEXT NOT NULL DEFAULT 'Sales',
  defaultModulesJson    TEXT NOT NULL DEFAULT '[]',
  incomeCategoriesJson  TEXT NOT NULL DEFAULT '[]',
  expenseCategoriesJson TEXT NOT NULL DEFAULT '[]',
  productCategoriesJson TEXT NOT NULL DEFAULT '[]',
  dashboardFocusJson    TEXT NOT NULL DEFAULT '[]',
  createdAt             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Notification (
  id        TEXT PRIMARY KEY,
  tenantId  TEXT,
  userId    TEXT,
  type      TEXT NOT NULL,
  title     TEXT NOT NULL,
  body      TEXT,
  link      TEXT,
  isRead    INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  syncState TEXT NOT NULL DEFAULT 'clean'
);
CREATE INDEX IF NOT EXISTS idx_notification_user ON Notification(userId, isRead);

CREATE TABLE IF NOT EXISTS AuditLog (
  id         TEXT PRIMARY KEY,
  tenantId   TEXT,
  userId     TEXT,
  action     TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId   TEXT,
  summary    TEXT,
  createdAt  TEXT NOT NULL,
  syncState  TEXT NOT NULL DEFAULT 'clean'
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON AuditLog(tenantId, createdAt);
