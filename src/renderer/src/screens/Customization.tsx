import { Sparkles, ExternalLink } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Card, PageHeader, Button } from '../ui/ui'
import { openOnWeb } from '../lib/web'

// Customization requests (custom features/changes a business asks BridgeYou to
// build) are managed on the web — they involve back-and-forth with the BridgeYou
// team and aren't part of the offline daily workflow.
export default function Customization() {
  const { t } = useI18n()
  const { context } = useSession()
  if (!context) return null

  return (
    <div className="space-y-5">
      <PageHeader title={t({ en: 'Customization', fr: 'Personnalisation' })} />
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand">
          <Sparkles size={24} />
        </span>
        <div className="text-base font-semibold text-ink">
          {t({ en: 'Request a custom feature', fr: 'Demander une fonctionnalité' })}
        </div>
        <p className="max-w-md text-sm text-muted">
          {t({
            en: 'Tell the BridgeYou team about changes you want for your business — new reports, fields, or workflows. Requests are tracked on the web.',
            fr: "Indiquez à l'équipe BridgeYou les changements souhaités pour votre entreprise — nouveaux rapports, champs ou flux. Les demandes sont suivies sur le web."
          })}
        </p>
        <Button onClick={() => openOnWeb(context.tenant.slug, 'customization')}>
          <ExternalLink size={15} />
          {t({ en: 'Open on web', fr: 'Ouvrir sur le web' })}
        </Button>
      </Card>
    </div>
  )
}
