import { useState, type FormEvent } from 'react'
import { Wifi, WifiOff, Building2, ChevronRight, ArrowLeft } from 'lucide-react'
import type { BusinessChoice, LoginResult } from '@core/dto'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Button, FormError } from '../ui/ui'
import { LanguageToggle } from '../components/LanguageToggle'

// Login + the software only — no marketing. Online login (with offline re-login
// against the cached bcrypt hash). When an account has multiple businesses, a
// picker is shown before entering the workspace.
export default function Login({ online }: { online: boolean }) {
  const { t, lang } = useI18n()
  const { setContext } = useSession()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [businesses, setBusinesses] = useState<BusinessChoice[] | null>(null)

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
    offline: t({
      en: 'No internet, and this account has never logged in on this device. Connect once to get started.',
      fr: "Pas d'internet, et ce compte ne s'est jamais connecté sur cet appareil. Connectez-vous une fois pour commencer."
    }),
    sync_failed: t({
      en: 'Signed in, but your data could not sync. Check your connection and try again.',
      fr: "Connecté, mais vos données n'ont pas pu se synchroniser. Vérifiez votre connexion et réessayez."
    }),
    no_data: t({
      en: 'Signed in offline, but no data has synced yet. Connect to the internet once.',
      fr: 'Connecté hors ligne, mais aucune donnée synchronisée. Connectez-vous à internet une fois.'
    }),
    missing: t({ en: 'Enter your email/phone and password.', fr: 'Saisissez votre e-mail/téléphone et mot de passe.' })
  }

  function handleResult(result: LoginResult) {
    if ('ok' in result && result.ok) {
      setContext(result.context)
    } else if ('needsSelection' in result) {
      setBusinesses(result.businesses)
    } else {
      setError(messages[result.error as keyof typeof messages] ?? messages.invalid)
    }
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
      handleResult(await window.byos.auth.login(identifier, password))
    } finally {
      setBusy(false)
    }
  }

  async function pickBusiness(id: string) {
    setError(undefined)
    setBusy(true)
    try {
      handleResult(await window.byos.auth.selectBusiness(id))
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

        {businesses ? (
          <div className="card p-6">
            <h1 className="text-xl font-bold text-ink">
              {t({ en: 'Choose a business', fr: 'Choisissez une entreprise' })}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t({ en: 'Your account has several businesses.', fr: 'Votre compte a plusieurs entreprises.' })}
            </p>
            <FormError message={error} />
            <div className="mt-4 space-y-2">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => pickBusiness(b.id)}
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand">
                    <Building2 size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{b.businessName}</span>
                    <span className="block truncate text-xs capitalize text-muted">{b.industryType}</span>
                  </span>
                  <ChevronRight size={16} className="text-muted" />
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setBusinesses(null)
                setError(undefined)
              }}
              className="mt-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
            >
              <ArrowLeft size={14} /> {t({ en: 'Back', fr: 'Retour' })}
            </button>
          </div>
        ) : (
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
        )}

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
