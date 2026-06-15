import { useState, type FormEvent } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Button, FormError } from '../ui/ui'
import { LanguageToggle } from '../components/LanguageToggle'

// Login + the software only — no marketing. Authenticates offline against the
// local DB (synced bcrypt hash). Ported copy from web/src/app/(auth)/login.
export default function Login({ online }: { online: boolean }) {
  const { t } = useI18n()
  const { setContext } = useSession()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const messages = {
    invalid: t({ en: 'Invalid login details. Please try again.', fr: 'Identifiants invalides. Veuillez réessayer.' }),
    unverified: t({
      en: 'This account is not verified yet. Verify it online once, then you can log in offline.',
      fr: "Ce compte n'est pas encore vérifié. Vérifiez-le une fois en ligne, puis connectez-vous hors ligne."
    }),
    no_business: t({
      en: 'No business is set up on this device for that account.',
      fr: "Aucune entreprise n'est configurée sur cet appareil pour ce compte."
    }),
    missing: t({ en: 'Enter your email/phone and password.', fr: 'Saisissez votre e-mail/téléphone et mot de passe.' })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(undefined)
    if (!identifier || !password) {
      setError(messages.missing)
      return
    }
    setBusy(true)
    try {
      const result = await window.byos.auth.login(identifier, password)
      if (result.ok) {
        setContext(result.context)
      } else {
        setError(messages[result.error as keyof typeof messages] ?? messages.invalid)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-canvas flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-tenant-primary text-white font-bold">
              B
            </div>
            <span className="font-bold text-ink">BridgeYou Business OS</span>
          </div>
          <LanguageToggle />
        </div>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-ink">{t({ en: 'Welcome back', fr: 'Bon retour' })}</h1>
          <p className="mt-1 text-sm text-muted">
            {t({ en: 'Log in to your business workspace.', fr: 'Connectez-vous à votre espace de travail.' })}
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <FormError message={error} />
            <div>
              <label className="label">{t({ en: 'Email or phone', fr: 'E-mail ou téléphone' })}</label>
              <input
                className="field"
                placeholder="you@business.cm"
                value={identifier}
                autoFocus
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t({ en: 'Password', fr: 'Mot de passe' })}</label>
              <input
                className="field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t({ en: 'Logging in…', fr: 'Connexion…' }) : t({ en: 'Log in', fr: 'Se connecter' })}
            </Button>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {online
            ? t({ en: 'Online', fr: 'En ligne' })
            : t({ en: 'Offline — login works without internet', fr: 'Hors ligne — la connexion fonctionne sans internet' })}
        </div>
      </div>
    </div>
  )
}
