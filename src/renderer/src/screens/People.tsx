import { useEffect, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import type { ContactDTO, CreateContactInput } from '@core/dto'
import { getLexicon, contactTypeForTemplate } from '@core/templates'
import { formatMoney } from '@core/format'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Button, Card, EmptyState, PageHeader, StatusBadge, FormError } from '../ui/ui'
import { Modal } from '../components/Modal'

export default function People() {
  const { t, lang } = useI18n()
  const { context } = useSession()
  const [contacts, setContacts] = useState<ContactDTO[]>([])
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const lex = context ? getLexicon(context.tenant.industryType, lang) : null
  const cur = context!.tenant.currency

  async function reload() {
    setLoading(true)
    setContacts(await window.byos.people.list())
    setLoading(false)
  }
  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="space-y-5">
      <PageHeader
        title={lex?.peopleNav ?? t({ en: 'People', fr: 'Personnes' })}
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} />
            {t({ en: 'Add', fr: 'Ajouter' })}
          </Button>
        }
      />

      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted">{t({ en: 'Loading…', fr: 'Chargement…' })}</div>
        ) : contacts.length === 0 ? (
          <EmptyState icon={<Users size={28} />} title={t({ en: 'No contacts yet', fr: 'Aucun contact' })} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t({ en: 'Name', fr: 'Nom' })}</th>
                  <th>{t({ en: 'Type', fr: 'Type' })}</th>
                  <th>{t({ en: 'Phone', fr: 'Téléphone' })}</th>
                  <th className="text-right">{t({ en: 'Balance', fr: 'Solde' })}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>
                      <StatusBadge status={c.contactType} label={c.contactType} />
                    </td>
                    <td className="text-muted">{c.phone ?? '—'}</td>
                    <td className="text-right text-muted">{formatMoney(c.balanceMinor, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && context && (
        <ContactForm
          industryType={context.tenant.industryType}
          onClose={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false)
            await reload()
          }}
        />
      )}
    </div>
  )
}

function ContactForm({
  industryType,
  onClose,
  onSaved
}: {
  industryType: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const primary = contactTypeForTemplate(industryType)
  const typeOptions = Array.from(new Set([primary, 'customer', 'supplier']))
  const [form, setForm] = useState<CreateContactInput>({ contactType: primary, name: '', phone: '', email: '', notes: '' })
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const typeLabel = (k: string) =>
    ({
      customer: t({ en: 'Customer', fr: 'Client' }),
      supplier: t({ en: 'Supplier', fr: 'Fournisseur' }),
      member: t({ en: 'Member', fr: 'Membre' }),
      student: t({ en: 'Student', fr: 'Élève' }),
      patient: t({ en: 'Patient', fr: 'Patient' })
    })[k] ?? k

  async function save() {
    setError(undefined)
    if (!form.name?.trim()) {
      setError(t({ en: 'Enter a name.', fr: 'Saisissez un nom.' }))
      return
    }
    setBusy(true)
    const res = await window.byos.people.create(form)
    setBusy(false)
    if (res.ok) onSaved()
    else setError(t({ en: 'Could not save.', fr: "Impossible d'enregistrer." }))
  }

  return (
    <Modal title={t({ en: 'Add contact', fr: 'Ajouter un contact' })} onClose={onClose}>
      <div className="space-y-4">
        <FormError message={error} />
        <div>
          <label className="label">{t({ en: 'Type', fr: 'Type' })}</label>
          <select
            className="field"
            value={form.contactType}
            onChange={(e) => setForm({ ...form, contactType: e.target.value })}
          >
            {typeOptions.map((k) => (
              <option key={k} value={k}>
                {typeLabel(k)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t({ en: 'Name', fr: 'Nom' })}</label>
          <input className="field" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t({ en: 'Phone', fr: 'Téléphone' })}</label>
            <input className="field" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">{t({ en: 'Email', fr: 'E-mail' })}</label>
            <input className="field" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t({ en: 'Cancel', fr: 'Annuler' })}
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? t({ en: 'Saving…', fr: 'Enregistrement…' }) : t({ en: 'Save', fr: 'Enregistrer' })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
