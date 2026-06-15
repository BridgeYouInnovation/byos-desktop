import { useEffect, useState, useCallback } from 'react'
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react'
import { clsx } from 'clsx'
import type { SyncStatusDTO } from '@core/dto'
import { useI18n } from '../lib/i18n'

function relativeTime(iso: string | null, lang: 'en' | 'fr'): string {
  if (!iso) return lang === 'fr' ? 'jamais' : 'never'
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (secs < 60) return lang === 'fr' ? "à l'instant" : 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return lang === 'fr' ? `il y a ${mins} min` : `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return lang === 'fr' ? `il y a ${hrs} h` : `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return lang === 'fr' ? `il y a ${days} j` : `${days}d ago`
}

// Sync status pill: online/offline, last-synced, pending-changes badge, Sync Now.
export function SyncStatus() {
  const { t, lang } = useI18n()
  const [status, setStatus] = useState<SyncStatusDTO | null>(null)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setStatus(await window.byos.sync.status())
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 4000)
    return () => clearInterval(id)
  }, [refresh])

  async function syncNow() {
    setSyncing(true)
    try {
      setStatus(await window.byos.sync.now())
    } finally {
      setSyncing(false)
    }
  }

  if (!status) return null
  const online = status.connected
  const busy = syncing || status.uploading || status.downloading
  const lastSynced = relativeTime(status.lastSyncedAt, lang)

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={clsx('inline-flex items-center gap-1 font-medium', online ? 'text-success' : 'text-muted')}
        title={online ? t({ en: 'Connected', fr: 'Connecté' }) : t({ en: 'Offline', fr: 'Hors ligne' })}
      >
        {online ? <Cloud size={14} /> : <CloudOff size={14} />}
        {online ? t({ en: 'Online', fr: 'En ligne' }) : t({ en: 'Offline', fr: 'Hors ligne' })}
      </span>

      <span className="text-muted">·</span>

      {status.pending > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 font-medium text-amber-700">
          {status.pending} {t({ en: 'pending', fr: 'en attente' })}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted">
          <Check size={13} className="text-success" />
          {t({ en: 'Synced', fr: 'Synchronisé' })} {lastSynced}
        </span>
      )}

      <button
        onClick={syncNow}
        disabled={busy}
        title={t({ en: 'Sync now', fr: 'Synchroniser' })}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-muted hover:bg-slate-100 disabled:opacity-50"
      >
        <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
        {t({ en: 'Sync now', fr: 'Synchroniser' })}
      </button>
    </div>
  )
}
