import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { Lang } from '@core/i18n'

// Tiny JSON prefs file in the app-data dir. Holds the persisted session token
// (so the user stays logged in across restarts — offline) and the language
// choice. (Phase 5: move the session token to the OS keychain / encrypt.)
type Prefs = {
  sessionToken?: string
  lang?: Lang
}

function file(): string {
  return join(app.getPath('userData'), 'prefs.json')
}

function read(): Prefs {
  try {
    if (!existsSync(file())) return {}
    return JSON.parse(readFileSync(file(), 'utf8')) as Prefs
  } catch {
    return {}
  }
}

function write(p: Prefs): void {
  writeFileSync(file(), JSON.stringify(p, null, 2), 'utf8')
}

export function getSessionToken(): string | null {
  return read().sessionToken ?? null
}
export function setSessionToken(token: string | null): void {
  const p = read()
  if (token) p.sessionToken = token
  else delete p.sessionToken
  write(p)
}

export function getLang(): Lang {
  return read().lang ?? 'fr' // French-first market
}
export function setLang(lang: Lang): void {
  const p = read()
  p.lang = lang
  write(p)
}
