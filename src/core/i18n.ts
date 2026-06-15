// Shared i18n primitives (pure). Ported from web/src/lib/i18n.ts minus the
// Next request-context lookup — the desktop resolves the active language from a
// local pref store instead of cookies/headers.

export type Lang = 'en' | 'fr'
export const LANGS: Lang[] = ['en', 'fr']

// Pick the right value from a bilingual record, e.g. tr(lang, { en: "Save", fr: "Enregistrer" }).
export function tr(lang: Lang, pair: { en: string; fr: string }): string {
  return pair[lang]
}
