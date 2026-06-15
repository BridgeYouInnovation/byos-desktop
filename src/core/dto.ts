// Data-transfer types crossing the IPC boundary (main repos ⇄ renderer).
// Kept in core so both sides share one definition. Dates cross IPC as ISO strings.
import type { SubscriptionAccess } from './access'

export type UserDTO = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  isPlatformAdmin: boolean
}

export type TenantDTO = {
  id: string
  businessName: string
  slug: string
  industryType: string
  city: string | null
  phone: string | null
  email: string | null
  currency: string
  language: string
  logoUrl: string | null
  themePrimary: string
  themeSecondary: string
  receiptHeader: string | null
  subscriptionStatus: string
}

export type TenantContextDTO = {
  user: UserDTO
  tenant: TenantDTO
  role: { id: string; name: string; isSystemRole: boolean } | null
  permissions: string[]
  isOwner: boolean
  access: SubscriptionAccess
  modules: string[] // enabled module keys
}

export type LoginResult =
  | { ok: true; context: TenantContextDTO }
  | { ok: false; error: string }

export type DashboardMetrics = {
  todayInMinor: number
  todayOutMinor: number
  monthInMinor: number
  monthOutMinor: number
  recordCount: number
  contactCount: number
  productCount: number
  lowStockCount: number
  recent: RecentRecordDTO[]
}

export type RecentRecordDTO = {
  id: string
  kind: string
  recordNumber: string
  amountMinor: number
  description: string | null
  contactName: string | null
  recordDate: string // ISO
}

// ── Reference data for forms (categories, accounts, branches, products) ───────
export type RefItem = { id: string; name: string }
export type ProductRef = { id: string; name: string; sellingPriceMinor: number | null; unit: string }

export type WorkspaceRefs = {
  branchId: string | null
  incomeCategories: RefItem[]
  expenseCategories: RefItem[]
  accounts: RefItem[]
  contacts: ContactDTO[]
  products: ProductRef[]
}

// ── Records ───────────────────────────────────────────────────────────────────
export type RecordListItem = {
  id: string
  kind: string
  recordNumber: string
  amountMinor: number
  paymentStatus: string
  description: string | null
  contactName: string | null
  recordDate: string
}

export type RecordItemDTO = {
  id: string
  productId: string | null
  name: string
  quantity: number
  unitPriceMinor: number
  lineTotalMinor: number
}

export type RecordDetailDTO = {
  id: string
  kind: string
  recordNumber: string
  amountMinor: number
  subtotalMinor: number
  discountMinor: number
  currency: string
  paymentStatus: string
  description: string | null
  contactName: string | null
  recordDate: string
  items: RecordItemDTO[]
}

export type SaleItemInput = {
  productId: string | null
  name: string
  quantity: number
  unitPriceMinor: number
}
export type CreateSaleInput = {
  contactId?: string | null
  accountId?: string | null
  recordDate?: string | null
  discountMinor?: number
  paymentStatus?: string
  items: SaleItemInput[]
}
export type CreateSimpleInput = {
  amountMinor: number
  description?: string | null
  categoryId?: string | null
  accountId?: string | null
  contactId?: string | null
  recordDate?: string | null
}

export type MutationResult = { ok: true; id: string } | { ok: false; error: string }

// ── Stock ─────────────────────────────────────────────────────────────────────
export type ProductDTO = {
  id: string
  name: string
  categoryName: string | null
  unit: string
  costPriceMinor: number | null
  sellingPriceMinor: number | null
  reorderLevel: number
  trackStock: boolean
  quantity: number
  status: string
}
export type CreateProductInput = {
  name: string
  categoryId?: string | null
  unit?: string
  costPriceMinor?: number | null
  sellingPriceMinor?: number | null
  reorderLevel?: number
  trackStock?: boolean
  openingQty?: number
}
export type StockMovementDTO = {
  id: string
  productName: string
  movementType: string
  quantity: number
  reason: string | null
  movementDate: string
}
export type AdjustStockInput = {
  productId: string
  movementType: 'stock_in' | 'stock_out' | 'adjustment' | 'damage'
  quantity: number
  reason?: string | null
}

// ── People ────────────────────────────────────────────────────────────────────
export type ContactDTO = {
  id: string
  contactType: string
  name: string
  phone: string | null
  email: string | null
  balanceMinor: number
  notes: string | null
}
export type CreateContactInput = {
  contactType: string
  name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
}

// ── Reports ───────────────────────────────────────────────────────────────────
export type ReportSummary = {
  from: string
  to: string
  totalInMinor: number
  totalOutMinor: number
  netMinor: number
  byCategory: { name: string; kind: string; totalMinor: number }[]
  topProducts: { name: string; quantity: number; totalMinor: number }[]
  daily: { date: string; inMinor: number; outMinor: number }[]
}
