import { useEffect, useState } from 'react'
import { CreditCard, ExternalLink } from 'lucide-react'
import type { SubscriptionInfo } from '@core/dto'
import { SUBSCRIPTION_STATUS_LABELS } from '@core/subscription'
import { formatMoney } from '@core/format'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Card, PageHeader, Button, StatusBadge } from '../ui/ui'
import { openOnWeb } from '../lib/web'

export default function Subscription() {
  const { t, lang } = useI18n()
  const { context } = useSession()
  const [info, setInfo] = useState<SubscriptionInfo>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.byos.billing
      .info()
      .then(setInfo)
      .finally(() => setLoading(false))
  }, [])

  if (!context) return null
  const tn = context.tenant
  const status = tn.subscriptionStatus
  const statusLabel = SUBSCRIPTION_STATUS_LABELS[status]?.[lang] ?? status
  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB') : '—'

  return (
    <div className="space-y-5">
      <PageHeader
        title={t({ en: 'Subscription', fr: 'Abonnement' })}
        actions={
          <Button onClick={() => openOnWeb(tn.slug, 'subscription')}>
            <ExternalLink size={15} />
            {t({ en: 'Subscribe / Renew', fr: "S'abonner / Renouveler" })}
          </Button>
        }
      />

      {context.access.banner && (
        <div className="rounded-lg border border-accent/30 bg-accent-50 px-3 py-2 text-sm text-amber-700">
          {context.access.banner.message}
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
            <CreditCard size={20} />
          </span>
          <div className="flex-1">
            <div className="font-semibold text-ink">{info?.planName ?? 'BYOS Annual'}</div>
            <div className="text-sm text-muted">
              {formatMoney(info?.priceMinor ?? 20000, info?.currency ?? tn.currency)} /
              {t({ en: ' year', fr: ' an' })}
            </div>
          </div>
          <StatusBadge status={status} label={statusLabel} />
        </div>

        {!loading && (
          <dl className="mt-4 divide-y divide-line border-t border-line pt-2">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">{t({ en: 'Current period', fr: 'Période en cours' })}</dt>
              <dd className="text-sm font-medium text-ink">
                {date(info?.currentPeriodStart ?? null)} → {date(info?.currentPeriodEnd ?? null)}
              </dd>
            </div>
            {info?.gracePeriodEnd && (
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted">{t({ en: 'Grace period ends', fr: 'Fin du délai de grâce' })}</dt>
                <dd className="text-sm font-medium text-ink">{date(info.gracePeriodEnd)}</dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      <p className="text-xs text-muted">
        {t({
          en: 'Payments are processed securely on the web (Fapshi). Opens in your browser.',
          fr: 'Les paiements sont traités en toute sécurité sur le web (Fapshi). Ouvre votre navigateur.'
        })}
      </p>
    </div>
  )
}
