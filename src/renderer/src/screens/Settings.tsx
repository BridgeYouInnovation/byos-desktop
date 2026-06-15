import { ExternalLink } from 'lucide-react'
import { getLexicon } from '@core/templates'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Card, PageHeader, Button } from '../ui/ui'
import { openOnWeb } from '../lib/web'

// Business profile (synced, read-only here). Editing profile/theme/logo is on the
// web app for now; the values shown come straight from the synced Tenant row.
export default function Settings() {
  const { t, lang } = useI18n()
  const { context } = useSession()
  if (!context) return null
  const tn = context.tenant
  const lex = getLexicon(tn.industryType, lang)

  const rows: { label: string; value: string | null }[] = [
    { label: t({ en: 'Business name', fr: "Nom de l'entreprise" }), value: tn.businessName },
    { label: t({ en: 'Industry', fr: 'Secteur' }), value: tn.industryType },
    { label: t({ en: 'City', fr: 'Ville' }), value: tn.city },
    { label: t({ en: 'Phone', fr: 'Téléphone' }), value: tn.phone },
    { label: t({ en: 'Email', fr: 'E-mail' }), value: tn.email },
    { label: t({ en: 'Currency', fr: 'Devise' }), value: tn.currency },
    { label: t({ en: 'Receipt header', fr: "En-tête du reçu" }), value: tn.receiptHeader }
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t({ en: 'Settings', fr: 'Paramètres' })}
        subtitle={lex.recordsSubtitle ? tn.businessName : undefined}
        actions={
          <Button variant="outline" size="sm" onClick={() => openOnWeb(tn.slug, 'settings')}>
            <ExternalLink size={15} />
            {t({ en: 'Edit on web', fr: 'Modifier sur le web' })}
          </Button>
        }
      />

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          {t({ en: 'Business profile', fr: "Profil de l'entreprise" })}
        </h2>
        <dl className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted">{r.label}</dt>
              <dd className="text-sm font-medium capitalize text-ink">{r.value || '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">{t({ en: 'Theme', fr: 'Thème' })}</h2>
        <div className="flex items-center gap-3">
          <span className="h-8 w-8 rounded-lg border border-line" style={{ background: tn.themePrimary }} />
          <span className="text-sm text-muted">{tn.themePrimary}</span>
        </div>
      </Card>
    </div>
  )
}
