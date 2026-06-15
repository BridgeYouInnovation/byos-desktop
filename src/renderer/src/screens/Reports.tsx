import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import type { ReportSummary } from '@core/dto'
import { formatMoney } from '@core/format'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Card, PageHeader, StatCard, EmptyState } from '../ui/ui'

type Period = 'month' | '30d' | 'year'

function range(period: Period): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()
  let from: Date
  if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1)
  else if (period === 'year') from = new Date(now.getFullYear(), 0, 1)
  else from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to }
}

export default function Reports() {
  const { t, lang } = useI18n()
  const { context } = useSession()
  const cur = context!.tenant.currency
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const { from, to } = range(period)
    window.byos.reports
      .summary(from, to)
      .then(setData)
      .finally(() => setLoading(false))
  }, [period])

  const periods: { key: Period; label: string }[] = [
    { key: 'month', label: t({ en: 'This month', fr: 'Ce mois' }) },
    { key: '30d', label: t({ en: 'Last 30 days', fr: '30 derniers jours' }) },
    { key: 'year', label: t({ en: 'This year', fr: 'Cette année' }) }
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t({ en: 'Reports', fr: 'Rapports' })}
        actions={
          <div className="flex gap-1">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  period === p.key ? 'bg-tenant-primary text-white' : 'text-muted hover:bg-slate-100'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {loading || !data ? (
        <div className="text-sm text-muted">{t({ en: 'Loading…', fr: 'Chargement…' })}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label={t({ en: 'Money in', fr: 'Entrées' })} value={formatMoney(data.totalInMinor, cur)} tone="green" />
            <StatCard label={t({ en: 'Money out', fr: 'Sorties' })} value={formatMoney(data.totalOutMinor, cur)} tone="red" />
            <StatCard
              label={t({ en: 'Net', fr: 'Net' })}
              value={formatMoney(data.netMinor, cur)}
              tone={data.netMinor >= 0 ? 'green' : 'red'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink">
                {t({ en: 'By category', fr: 'Par catégorie' })}
              </h2>
              {data.byCategory.length === 0 ? (
                <EmptyState title={t({ en: 'No data', fr: 'Aucune donnée' })} />
              ) : (
                <table className="table">
                  <tbody>
                    {data.byCategory.map((c, i) => (
                      <tr key={i}>
                        <td>{c.name}</td>
                        <td className="text-muted">
                          {c.kind === 'expense' ? t({ en: 'Expense', fr: 'Dépense' }) : t({ en: 'Income', fr: 'Revenu' })}
                        </td>
                        <td className={clsx('text-right font-semibold', c.kind === 'expense' ? 'text-danger' : 'text-success')}>
                          {formatMoney(c.totalMinor, cur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink">
                {t({ en: 'Top products', fr: 'Meilleurs produits' })}
              </h2>
              {data.topProducts.length === 0 ? (
                <EmptyState title={t({ en: 'No sales', fr: 'Aucune vente' })} />
              ) : (
                <table className="table">
                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr key={i}>
                        <td>{p.name}</td>
                        <td className="text-right text-muted">×{p.quantity}</td>
                        <td className="text-right font-semibold text-success">{formatMoney(p.totalMinor, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          <div className="text-xs text-muted">
            {new Date(data.from).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')} —{' '}
            {new Date(data.to).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
          </div>
        </>
      )}
    </div>
  )
}
