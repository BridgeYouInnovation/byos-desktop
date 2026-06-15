import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Receipt as ReceiptIcon } from 'lucide-react'
import { clsx } from 'clsx'
import type {
  RecordListItem,
  WorkspaceRefs,
  SaleItemInput,
  RecordDetailDTO
} from '@core/dto'
import { getLexicon } from '@core/templates'
import { formatMoney } from '@core/format'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Button, Card, EmptyState, PageHeader, StatusBadge, FormError } from '../ui/ui'
import { Modal } from '../components/Modal'
import { Receipt } from '../components/Receipt'

type Tab = 'all' | 'sale' | 'income' | 'expense'
type FormKind = 'sale' | 'income' | 'expense' | null

export default function Records() {
  const { t, lang } = useI18n()
  const { context } = useSession()
  const [tab, setTab] = useState<Tab>('all')
  const [rows, setRows] = useState<RecordListItem[]>([])
  const [refs, setRefs] = useState<WorkspaceRefs | null>(null)
  const [form, setForm] = useState<FormKind>(null)
  const [receipt, setReceipt] = useState<RecordDetailDTO | null>(null)
  const [loading, setLoading] = useState(true)

  const canCreate = context?.access.canCreate ?? false
  const lex = context ? getLexicon(context.tenant.industryType, lang) : null

  async function reload() {
    setLoading(true)
    const list = await window.byos.records.list(tab === 'all' ? undefined : tab)
    setRows(list)
    setLoading(false)
  }
  useEffect(() => {
    reload()
  }, [tab])
  useEffect(() => {
    window.byos.refs.get().then(setRefs)
  }, [])

  async function openReceipt(id: string) {
    const detail = await window.byos.records.detail(id)
    if (detail) setReceipt(detail)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: t({ en: 'All', fr: 'Tout' }) },
    { key: 'sale', label: t({ en: 'Sales', fr: 'Ventes' }) },
    { key: 'income', label: t({ en: 'Income', fr: 'Revenus' }) },
    { key: 'expense', label: t({ en: 'Expenses', fr: 'Dépenses' }) }
  ]

  const kindLabel = (k: string) =>
    k === 'sale'
      ? t({ en: 'Sale', fr: 'Vente' })
      : k === 'expense'
        ? t({ en: 'Expense', fr: 'Dépense' })
        : k === 'income'
          ? t({ en: 'Income', fr: 'Revenu' })
          : k

  return (
    <div className="space-y-5">
      <PageHeader
        title={lex?.recordsNav ?? t({ en: 'Records', fr: 'Registres' })}
        subtitle={lex?.recordsSubtitle}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setForm('expense')} disabled={!canCreate}>
              <Plus size={15} />
              {t({ en: 'Expense', fr: 'Dépense' })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setForm('income')} disabled={!canCreate}>
              <Plus size={15} />
              {t({ en: 'Income', fr: 'Revenu' })}
            </Button>
            <Button size="sm" onClick={() => setForm('sale')} disabled={!canCreate}>
              <Plus size={15} />
              {t({ en: 'New sale', fr: 'Nouvelle vente' })}
            </Button>
          </div>
        }
      />

      {!canCreate && (
        <div className="rounded-lg border border-accent/30 bg-accent-50 px-3 py-2 text-sm text-amber-700">
          {t({
            en: 'Recording is a paid feature. Subscribe to record sales, income and expenses.',
            fr: "L'enregistrement est une fonction payante. Abonnez-vous pour enregistrer ventes, revenus et dépenses."
          })}
        </div>
      )}

      <div className="flex gap-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium',
              tab === tb.key ? 'bg-tenant-primary text-white' : 'text-muted hover:bg-slate-100'
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted">{t({ en: 'Loading…', fr: 'Chargement…' })}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={28} />}
            title={t({ en: 'No records yet', fr: 'Aucun registre' })}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t({ en: 'Number', fr: 'Numéro' })}</th>
                  <th>{t({ en: 'Type', fr: 'Type' })}</th>
                  <th>{t({ en: 'Description', fr: 'Description' })}</th>
                  <th>{lex?.peopleNav ?? t({ en: 'Contact', fr: 'Contact' })}</th>
                  <th className="text-right">{t({ en: 'Amount', fr: 'Montant' })}</th>
                  <th>{t({ en: 'Date', fr: 'Date' })}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.recordNumber}</td>
                    <td>
                      <StatusBadge status={r.kind} label={kindLabel(r.kind)} />
                    </td>
                    <td className="text-muted">{r.description ?? '—'}</td>
                    <td className="text-muted">{r.contactName ?? '—'}</td>
                    <td
                      className={clsx(
                        'text-right font-semibold',
                        r.kind === 'expense' ? 'text-danger' : 'text-success'
                      )}
                    >
                      {formatMoney(r.amountMinor, context!.tenant.currency)}
                    </td>
                    <td className="text-muted">
                      {new Date(r.recordDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                    </td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => openReceipt(r.id)}>
                        {t({ en: 'Receipt', fr: 'Reçu' })}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {form === 'sale' && refs && (
        <SaleForm
          refs={refs}
          onClose={() => setForm(null)}
          onSaved={async (id) => {
            setForm(null)
            await reload()
            await openReceipt(id)
          }}
        />
      )}
      {(form === 'income' || form === 'expense') && refs && (
        <SimpleForm
          kind={form}
          refs={refs}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null)
            await reload()
          }}
        />
      )}
      {receipt && context && (
        <Modal title={receipt.recordNumber} onClose={() => setReceipt(null)} size="md">
          <Receipt record={receipt} tenant={context.tenant} />
        </Modal>
      )}
    </div>
  )
}

// ── Sale form ─────────────────────────────────────────────────────────────────
function SaleForm({
  refs,
  onClose,
  onSaved
}: {
  refs: WorkspaceRefs
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const { t, lang } = useI18n()
  const { context } = useSession()
  const cur = context!.tenant.currency
  const [contactId, setContactId] = useState<string>('')
  const [discount, setDiscount] = useState<number>(0)
  const [items, setItems] = useState<SaleItemInput[]>([
    { productId: null, name: '', quantity: 1, unitPriceMinor: 0 }
  ])
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + Math.round(i.unitPriceMinor) * (i.quantity || 0), 0),
    [items]
  )
  const total = Math.max(0, subtotal - (discount || 0))

  function setItem(idx: number, patch: Partial<SaleItemInput>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function onPickProduct(idx: number, productId: string) {
    const p = refs.products.find((x) => x.id === productId)
    if (p) setItem(idx, { productId: p.id, name: p.name, unitPriceMinor: p.sellingPriceMinor ?? 0 })
    else setItem(idx, { productId: null })
  }

  async function save() {
    setError(undefined)
    const valid = items.filter((i) => i.name.trim() && i.quantity > 0)
    if (valid.length === 0) {
      setError(t({ en: 'Add at least one item.', fr: 'Ajoutez au moins un article.' }))
      return
    }
    setBusy(true)
    const res = await window.byos.records.createSale({
      contactId: contactId || null,
      discountMinor: discount || 0,
      items: valid
    })
    setBusy(false)
    if (res.ok) onSaved(res.id)
    else setError(t({ en: 'Could not save the sale.', fr: "Impossible d'enregistrer la vente." }))
  }

  return (
    <Modal title={t({ en: 'New sale', fr: 'Nouvelle vente' })} onClose={onClose} size="lg">
      <div className="space-y-4">
        <FormError message={error} />
        <div>
          <label className="label">{t({ en: 'Customer (optional)', fr: 'Client (optionnel)' })}</label>
          <select className="field" value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">{t({ en: 'Walk-in', fr: 'Comptoir' })}</option>
            {refs.contacts
              .filter((c) => c.contactType !== 'supplier')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="label">{t({ en: 'Items', fr: 'Articles' })}</label>
          {items.map((it, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <select
                  className="field"
                  value={it.productId ?? ''}
                  onChange={(e) => onPickProduct(idx, e.target.value)}
                >
                  <option value="">{t({ en: 'Custom item…', fr: 'Article libre…' })}</option>
                  {refs.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {!it.productId && (
                  <input
                    className="field mt-1"
                    placeholder={t({ en: 'Item name', fr: "Nom de l'article" })}
                    value={it.name}
                    onChange={(e) => setItem(idx, { name: e.target.value })}
                  />
                )}
              </div>
              <div className="w-16">
                <span className="label">{t({ en: 'Qty', fr: 'Qté' })}</span>
                <input
                  className="field"
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })}
                />
              </div>
              <div className="w-28">
                <span className="label">{t({ en: 'Unit price', fr: 'Prix unit.' })}</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  value={it.unitPriceMinor}
                  onChange={(e) => setItem(idx, { unitPriceMinor: Number(e.target.value) })}
                />
              </div>
              <button
                className="mb-1 rounded-lg p-2 text-muted hover:bg-slate-100"
                onClick={() => setItems((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setItems((arr) => [...arr, { productId: null, name: '', quantity: 1, unitPriceMinor: 0 }])
            }
          >
            <Plus size={15} />
            {t({ en: 'Add item', fr: 'Ajouter un article' })}
          </Button>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-line pt-3">
          <div className="w-40">
            <label className="label">{t({ en: 'Discount', fr: 'Remise' })}</label>
            <input
              className="field"
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">{t({ en: 'Total', fr: 'Total' })}</div>
            <div className="text-2xl font-bold text-ink">{formatMoney(total, cur)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t({ en: 'Cancel', fr: 'Annuler' })}
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? t({ en: 'Saving…', fr: 'Enregistrement…' }) : t({ en: 'Save & print', fr: 'Enregistrer & imprimer' })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Income / Expense form ─────────────────────────────────────────────────────
function SimpleForm({
  kind,
  refs,
  onClose,
  onSaved
}: {
  kind: 'income' | 'expense'
  refs: WorkspaceRefs
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [amount, setAmount] = useState<number>(0)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const cats = kind === 'income' ? refs.incomeCategories : refs.expenseCategories

  async function save() {
    setError(undefined)
    if (!(amount > 0)) {
      setError(t({ en: 'Enter an amount.', fr: 'Saisissez un montant.' }))
      return
    }
    setBusy(true)
    const payload = { amountMinor: amount, description: description || null, categoryId: categoryId || null }
    const res =
      kind === 'income'
        ? await window.byos.records.createIncome(payload)
        : await window.byos.records.createExpense(payload)
    setBusy(false)
    if (res.ok) onSaved()
    else setError(t({ en: 'Could not save.', fr: "Impossible d'enregistrer." }))
  }

  return (
    <Modal
      title={kind === 'income' ? t({ en: 'Record income', fr: 'Enregistrer un revenu' }) : t({ en: 'Record expense', fr: 'Enregistrer une dépense' })}
      onClose={onClose}
    >
      <div className="space-y-4">
        <FormError message={error} />
        <div>
          <label className="label">{t({ en: 'Amount', fr: 'Montant' })}</label>
          <input
            className="field"
            type="number"
            min={0}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">{t({ en: 'Category', fr: 'Catégorie' })}</label>
          <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t({ en: 'Uncategorized', fr: 'Sans catégorie' })}</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t({ en: 'Description', fr: 'Description' })}</label>
          <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} />
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
