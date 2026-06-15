import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Lang } from '@core/i18n'
import { tr } from '@core/i18n'

type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (pair: { en: string; fr: string }) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr') // French-first market

  useEffect(() => {
    window.byos.prefs.getLang().then(setLangState)
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    window.byos.prefs.setLang(next)
  }, [])

  const t = useCallback((pair: { en: string; fr: string }) => tr(lang, pair), [lang])

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
