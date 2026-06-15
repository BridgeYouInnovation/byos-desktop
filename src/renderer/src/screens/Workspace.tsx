import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users as UsersIcon,
  BarChart3,
  UserCog,
  Settings as SettingsIcon,
  CreditCard,
  Sparkles,
  LogOut,
  type LucideIcon
} from 'lucide-react'
import { getLexicon } from '@core/templates'
import { hasPermission } from '@core/permissions'
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
import Users from './Users'
import Settings from './Settings'
import Subscription from './Subscription'
import Customization from './Customization'

type NavKey =
  | 'dashboard'
  | 'records'
  | 'stock'
  | 'people'
  | 'reports'
  | 'users'
  | 'settings'
  | 'subscription'
  | 'customization'

type NavItem = { key: NavKey; label: string; icon: LucideIcon }
type NavSection = { title: string; items: NavItem[] }

export default function Workspace() {
  const { t, lang } = useI18n()
  const { context, logout } = useSession()
  const [active, setActive] = useState<NavKey>('dashboard')

  // Navigation mirrors the web app's WorkspaceLayout: three sections, items gated
  // by enabled modules + RBAC permissions, labels from the industry lexicon.
  const sections = useMemo<NavSection[]>(() => {
    if (!context) return []
    const lex = getLexicon(context.tenant.industryType, lang)
    const has = (k: string) => context.modules.includes(k)
    const can = (k: string) => hasPermission(context.permissions, k)
    const out: NavSection[] = []

    out.push({
      title: t({ en: 'Home', fr: 'Accueil' }),
      items: [{ key: 'dashboard', label: t({ en: 'Dashboard', fr: 'Tableau de bord' }), icon: LayoutDashboard }]
    })

    const manage: NavItem[] = []
    if ((has('sales') || has('income') || has('expenses')) && can('sales.view'))
      manage.push({ key: 'records', label: lex.recordsNav, icon: ShoppingCart })
    if (has('stock') && can('stock.view')) manage.push({ key: 'stock', label: lex.stockNav, icon: Boxes })
    if (has('people') && can('people.view')) manage.push({ key: 'people', label: lex.peopleNav, icon: UsersIcon })
    if (can('reports.view'))
      manage.push({ key: 'reports', label: t({ en: 'Reports', fr: 'Rapports' }), icon: BarChart3 })
    if (manage.length) out.push({ title: t({ en: 'Manage', fr: 'Gérer' }), items: manage })

    const business: NavItem[] = []
    if (can('users.view'))
      business.push({ key: 'users', label: t({ en: 'Users & Roles', fr: 'Utilisateurs et rôles' }), icon: UserCog })
    if (can('settings.view'))
      business.push({ key: 'settings', label: t({ en: 'Settings', fr: 'Paramètres' }), icon: SettingsIcon })
    if (can('billing.view'))
      business.push({ key: 'subscription', label: t({ en: 'Subscription', fr: 'Abonnement' }), icon: CreditCard })
    if (can('customization.view'))
      business.push({
        key: 'customization',
        label: t({ en: 'Customization', fr: 'Personnalisation' }),
        icon: Sparkles
      })
    if (business.length) out.push({ title: t({ en: 'Business', fr: 'Entreprise' }), items: business })

    return out
  }, [context, lang, t])

  if (!context) return null
  const { tenant, user, access } = context
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[tenant.subscriptionStatus]?.[lang] ?? tenant.subscriptionStatus
  const activeLabel = sections.flatMap((s) => s.items).find((n) => n.key === active)?.label ?? ''

  return (
    <div className="flex h-full" style={{ ['--tenant-primary' as string]: tenant.themePrimary }}>
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col bg-navy text-slate-300">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-tenant-primary text-white font-bold">
            {tenant.businessName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{tenant.businessName}</div>
            <div className="truncate text-xs text-slate-400 capitalize">{tenant.industryType}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {sections.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActive(item.key)}
                      className={clsx(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        active === item.key
                          ? 'bg-tenant-primary text-white'
                          : 'text-slate-300 hover:bg-navy-600 hover:text-white'
                      )}
                    >
                      <Icon size={17} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
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
          {active === 'users' && <Users />}
          {active === 'settings' && <Settings />}
          {active === 'subscription' && <Subscription />}
          {active === 'customization' && <Customization />}
        </main>
      </div>
    </div>
  )
}
