import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  LogOut,
  type LucideIcon
} from 'lucide-react'
import { getLexicon } from '@core/templates'
import { SUBSCRIPTION_STATUS_LABELS } from '@core/subscription'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Banner, Button, StatusBadge } from '../ui/ui'
import { LanguageToggle } from '../components/LanguageToggle'
import { SyncStatus } from '../components/SyncStatus'
import Dashboard from './Dashboard'
import Records from './Records'
import Stock from './Stock'
import People from './People'
import Reports from './Reports'

type NavKey = 'dashboard' | 'records' | 'stock' | 'people' | 'reports'

export default function Workspace() {
  const { t, lang } = useI18n()
  const { context, logout } = useSession()
  const [active, setActive] = useState<NavKey>('dashboard')

  const nav = useMemo(() => {
    if (!context) return []
    const lex = getLexicon(context.tenant.industryType, lang)
    const has = (k: string) => context.modules.includes(k)
    const items: { key: NavKey; label: string; icon: LucideIcon }[] = [
      { key: 'dashboard', label: t({ en: 'Dashboard', fr: 'Tableau de bord' }), icon: LayoutDashboard }
    ]
    if (has('sales') || has('income') || has('expenses'))
      items.push({ key: 'records', label: lex.recordsNav, icon: ShoppingBag })
    if (has('stock') && lex.tracksStock)
      items.push({ key: 'stock', label: lex.stockNav, icon: Package })
    if (has('people') || has('suppliers'))
      items.push({ key: 'people', label: lex.peopleNav, icon: Users })
    if (has('reports'))
      items.push({ key: 'reports', label: t({ en: 'Reports', fr: 'Rapports' }), icon: BarChart3 })
    return items
  }, [context, lang, t])

  if (!context) return null
  const { tenant, user, access } = context
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[tenant.subscriptionStatus]?.[lang] ?? tenant.subscriptionStatus
  const activeLabel = nav.find((n) => n.key === active)?.label ?? ''

  return (
    <div
      className="flex h-full"
      style={{ ['--tenant-primary' as string]: tenant.themePrimary }}
    >
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-navy text-slate-300">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-tenant-primary text-white font-bold">
            {tenant.businessName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{tenant.businessName}</div>
            <div className="truncate text-xs text-slate-400 capitalize">{tenant.industryType}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-2">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active === item.key
                    ? 'bg-tenant-primary text-white'
                    : 'text-slate-300 hover:bg-navy-600 hover:text-white'
                )}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="border-t border-navy-600 px-4 py-3">
          <div className="truncate text-sm font-medium text-white">{user.fullName}</div>
          <div className="truncate text-xs text-slate-400">{context.role?.name ?? ''}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
          <h1 className="text-base font-semibold text-ink">{activeLabel}</h1>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <StatusBadge status={tenant.subscriptionStatus} label={statusLabel} />
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut size={15} />
              {t({ en: 'Log out', fr: 'Déconnexion' })}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {access.banner && (
            <div className="mb-4">
              <Banner tone={access.banner.tone}>{access.banner.message}</Banner>
            </div>
          )}
          {active === 'dashboard' && <Dashboard />}
          {active === 'records' && <Records />}
          {active === 'stock' && <Stock />}
          {active === 'people' && <People />}
          {active === 'reports' && <Reports />}
        </main>
      </div>
    </div>
  )
}
