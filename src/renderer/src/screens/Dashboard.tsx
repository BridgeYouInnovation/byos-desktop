import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Package, Users, ShoppingBag, AlertTriangle } from 'lucide-react'
import type { DashboardMetrics } from '@core/dto'
import { getLexicon } from '@core/templates'
import { formatMoney } from '@core/format'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { StatCard, Card, PageHeader, EmptyState, StatusBadge } from '../ui/ui'

export default function Dashboard() {
  const { t, lang } = useI18n()
  const { context } = useSession()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.byos.dashboard
      .metrics()
      .then(setMetrics)
      .finally(() => setLoading(false))
  }, [])

  if (!context) return null
  const lex = getLexicon(context.tenant.industryType, lang)
  const cur = context.tenant.currency

  return (
    <div className="space-y-5">
      <PageHeader
        title={t({ en: 'Dashboard', fr: 'Tableau de bord' })}
        subtitle={context.tenant.businessName}
      />

      {loading || !metrics ? (
        <div className="text-sm text-muted">{t({ en: 'Loading…', fr: 'Chargement…' })}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={t({ en: 'Money in today', fr: "Entrées aujourd'hui" })}
              value={formatMoney(metrics.todayInMinor, cur)}
              tone="green"
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              label={t({ en: 'Money out today', fr: "Sorties aujourd'hui" })}
              value={formatMoney(metrics.todayOutMinor, cur)}
              tone="red"
              icon={<TrendingDown size={18} />}
            />
            <StatCard
              label={t({ en: 'In this month', fr: 'Entrées ce mois' })}
              value={formatMoney(metrics.monthInMinor, cur)}
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              label={t({ en: 'Out this month', fr: 'Sorties ce mois' })}
              value={formatMoney(metrics.monthOutMinor, cur)}
              icon={<TrendingDown size={18} />}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={lex.recordsNav} value={metrics.recordCount} icon={<ShoppingBag size={18} />} />
            <StatCard label={lex.peopleNav} value={metrics.contactCount} icon={<Users size={18} />} />
            <StatCard label={lex.productsNoun} value={metrics.productCount} icon={<Package size={18} />} />
            <StatCard
              label={t({ en: 'Low stock', fr: 'Stock faible' })}
              value={metrics.lowStockCount}
              tone={metrics.lowStockCount > 0 ? 'amber' : 'default'}
              icon={<AlertTriangle size={18} />}
            />
          </div>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              {t({ en: 'Recent records', fr: 'Registres récents' })}
            </h2>
            {metrics.recent.length === 0 ? (
              <EmptyState title={t({ en: 'No records yet', fr: 'Aucun registre' })} />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t({ en: 'Number', fr: 'Numéro' })}</th>
                      <th>{t({ en: 'Type', fr: 'Type' })}</th>
                      <th>{t({ en: 'Description', fr: 'Description' })}</th>
                      <th>{lex.peopleNav}</th>
                      <th className="text-right">{t({ en: 'Amount', fr: 'Montant' })}</th>
                      <th>{t({ en: 'Date', fr: 'Date' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recent.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.recordNumber}</td>
                        <td>
                          <StatusBadge
                            status={r.kind}
                            label={
                              r.kind === 'sale'
                                ? t({ en: 'Sale', fr: 'Vente' })
                                : r.kind === 'expense'
                                  ? t({ en: 'Expense', fr: 'Dépense' })
                                  : r.kind === 'income'
                                    ? t({ en: 'Income', fr: 'Revenu' })
                                    : r.kind
                            }
                          />
                        </td>
                        <td className="text-muted">{r.description ?? '—'}</td>
                        <td className="text-muted">{r.contactName ?? '—'}</td>
                        <td
                          className={
                            'text-right font-semibold ' +
                            (r.kind === 'expense' ? 'text-danger' : 'text-success')
                          }
                        >
                          {formatMoney(r.amountMinor, cur)}
                        </td>
                        <td className="text-muted">
                          {new Date(r.recordDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
