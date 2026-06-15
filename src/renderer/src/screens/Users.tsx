import { useEffect, useState } from 'react'
import { ExternalLink, UserCog } from 'lucide-react'
import type { RoleInfo } from '@core/dto'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Card, PageHeader, Button, EmptyState } from '../ui/ui'
import { openOnWeb } from '../lib/web'

// Roles + headcount (synced). Inviting/editing teammates needs email + the other
// members' profiles (not synced to devices), so it's handled on the web.
export default function Users() {
  const { t } = useI18n()
  const { context } = useSession()
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.byos.team
      .roles()
      .then(setRoles)
      .finally(() => setLoading(false))
  }, [])

  if (!context) return null

  return (
    <div className="space-y-5">
      <PageHeader
        title={t({ en: 'Users & Roles', fr: 'Utilisateurs et rôles' })}
        actions={
          <Button variant="outline" size="sm" onClick={() => openOnWeb(context.tenant.slug, 'users')}>
            <ExternalLink size={15} />
            {t({ en: 'Manage team on web', fr: "Gérer l'équipe sur le web" })}
          </Button>
        }
      />

      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted">{t({ en: 'Loading…', fr: 'Chargement…' })}</div>
        ) : roles.length === 0 ? (
          <EmptyState icon={<UserCog size={28} />} title={t({ en: 'No roles', fr: 'Aucun rôle' })} />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t({ en: 'Role', fr: 'Rôle' })}</th>
                <th>{t({ en: 'Description', fr: 'Description' })}</th>
                <th className="text-right">{t({ en: 'Permissions', fr: 'Permissions' })}</th>
                <th className="text-right">{t({ en: 'Members', fr: 'Membres' })}</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-muted">{r.description ?? '—'}</td>
                  <td className="text-right text-muted">
                    {r.permissionCount === -1 ? t({ en: 'Full access', fr: 'Accès complet' }) : r.permissionCount}
                  </td>
                  <td className="text-right font-semibold text-ink">{r.memberCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
