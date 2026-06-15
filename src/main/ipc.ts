import { app, ipcMain, shell } from 'electron'
import { login, selectBusiness, getCurrentContext, logout } from './repos/auth'
import { getDashboardMetrics } from './repos/dashboard'
import { getWorkspaceRefs } from './repos/refs'
import { createSale, createIncome, createExpense, listRecords, getRecordDetail } from './repos/records'
import { listProducts, createProduct, adjustStock, listMovements } from './repos/stock'
import { listContacts, createContact } from './repos/people'
import { getReportSummary } from './repos/reports'
import { getSubscriptionInfo, listRoles } from './repos/billing'
import { getSyncStatus, triggerSync, type SyncStatusDTO } from './sync/powersync'
import { getLang, setLang } from './prefs'
import type { Lang } from '@core/i18n'
import type { TenantContextDTO, LoginResult, DashboardMetrics, MutationResult } from '@core/dto'

// Resolve the active workspace context or throw — used by workspace-scoped handlers.
async function requireContext(): Promise<TenantContextDTO> {
  const ctx = await getCurrentContext()
  if (!ctx) throw new Error('not_authenticated')
  return ctx
}

// Wrap a mutation: resolve context, optionally enforce create-gating, return a
// MutationResult instead of throwing across IPC.
async function mutate(
  opts: { requireCreate?: boolean },
  fn: (ctx: TenantContextDTO) => Promise<string>
): Promise<MutationResult> {
  try {
    const ctx = await requireContext()
    if (opts.requireCreate && !ctx.access.canCreate) return { ok: false, error: 'not_allowed' }
    return { ok: true, id: await fn(ctx) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error' }
  }
}

export function registerIpc(): void {
  ipcMain.handle('app:getVersion', () => app.getVersion())
  // Open admin features (billing, team, customization) in the system browser.
  ipcMain.handle('app:openExternal', (_e, url: string) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })

  // ── Auth ──────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_e, identifier: string, password: string): Promise<LoginResult> =>
    login(identifier, password)
  )
  ipcMain.handle(
    'auth:selectBusiness',
    async (_e, identifier: string, password: string, tenantId: string): Promise<LoginResult> =>
      selectBusiness(identifier, password, tenantId)
  )
  ipcMain.handle('auth:context', async (): Promise<TenantContextDTO | null> => getCurrentContext())
  ipcMain.handle('auth:logout', async (): Promise<void> => logout())

  // ── Dashboard + reference data ──────────────────────────────────────────────
  ipcMain.handle('dashboard:metrics', async (): Promise<DashboardMetrics | null> => {
    const ctx = await getCurrentContext()
    return ctx ? getDashboardMetrics(ctx.tenant.id) : null
  })
  ipcMain.handle('refs:get', async () => getWorkspaceRefs((await requireContext()).tenant.id))

  // ── Records ─────────────────────────────────────────────────────────────────
  ipcMain.handle('records:list', async (_e, kind?: string) =>
    listRecords((await requireContext()).tenant.id, { kind })
  )
  ipcMain.handle('records:detail', async (_e, id: string) =>
    getRecordDetail((await requireContext()).tenant.id, id)
  )
  ipcMain.handle('records:createSale', async (_e, input) =>
    mutate({ requireCreate: true }, (ctx) => createSale(ctx.tenant.id, ctx.user.id, input))
  )
  ipcMain.handle('records:createIncome', async (_e, input) =>
    mutate({ requireCreate: true }, (ctx) => createIncome(ctx.tenant.id, ctx.user.id, input))
  )
  ipcMain.handle('records:createExpense', async (_e, input) =>
    mutate({ requireCreate: true }, (ctx) => createExpense(ctx.tenant.id, ctx.user.id, input))
  )

  // ── Stock (setup allowed during trial) ──────────────────────────────────────
  ipcMain.handle('stock:products', async () => listProducts((await requireContext()).tenant.id))
  ipcMain.handle('stock:createProduct', async (_e, input) =>
    mutate({}, (ctx) => createProduct(ctx.tenant.id, ctx.user.id, input))
  )
  ipcMain.handle('stock:adjust', async (_e, input) =>
    mutate({}, async (ctx) => {
      await adjustStock(ctx.tenant.id, ctx.user.id, input)
      return input.productId
    })
  )
  ipcMain.handle('stock:movements', async (_e, productId?: string) =>
    listMovements((await requireContext()).tenant.id, productId)
  )

  // ── People ──────────────────────────────────────────────────────────────────
  ipcMain.handle('people:list', async (_e, type?: string) =>
    listContacts((await requireContext()).tenant.id, type)
  )
  ipcMain.handle('people:create', async (_e, input) =>
    mutate({}, (ctx) => createContact(ctx.tenant.id, input))
  )

  // ── Reports ─────────────────────────────────────────────────────────────────
  ipcMain.handle('reports:summary', async (_e, from: string, to: string) =>
    getReportSummary((await requireContext()).tenant.id, from, to)
  )

  // ── Subscription + team ──────────────────────────────────────────────────────
  ipcMain.handle('billing:info', async () => getSubscriptionInfo((await requireContext()).tenant.id))
  ipcMain.handle('team:roles', async () => listRoles((await requireContext()).tenant.id))

  // ── Sync status ──────────────────────────────────────────────────────────────
  ipcMain.handle('sync:status', async (): Promise<SyncStatusDTO> => getSyncStatus())
  ipcMain.handle('sync:now', async (): Promise<SyncStatusDTO> => {
    await triggerSync()
    return getSyncStatus()
  })

  // ── Prefs ───────────────────────────────────────────────────────────────────
  ipcMain.handle('prefs:getLang', (): Lang => getLang())
  ipcMain.handle('prefs:setLang', (_e, lang: Lang): void => setLang(lang))
}
