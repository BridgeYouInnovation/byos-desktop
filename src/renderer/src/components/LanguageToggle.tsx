import { clsx } from 'clsx'
import { useI18n } from '../lib/i18n'
import { LANGS } from '@core/i18n'

// EN / FR switch, persisted to local prefs. Ported from web LanguageToggle.
export function LanguageToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-0.5 text-xs font-semibold">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={clsx(
            'rounded-md px-2 py-1 uppercase transition-colors',
            lang === l ? 'bg-tenant-primary text-white' : 'text-muted hover:text-ink'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
