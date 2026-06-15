import { useEffect, useState } from 'react'
import { Plus, Package } from 'lucide-react'
import { clsx } from 'clsx'
import type { ProductDTO, AdjustStockInput } from '@core/dto'
import { getLexicon } from '@core/templates'
import { formatMoney } from '@core/format'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { Button, Card, EmptyState, PageHeader, FormError } from '../ui/ui'
import { Modal } from '../components/Modal'

export default function Stock() {
  const { t, lang } = useI18n()
  const { context } = useSession()
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [adding, setAdding] = useState(false)
  const [adjust, setAdjust] = useState<ProductDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const lex = context ? getLexicon(context.tenant.industryType, lang) : null
  const cur = context!.tenant.currency
  // Some industries (e.g. a restaurant menu) don't track stock quantities.
  const tracks = lex?.tracksStock !== false

  async function reload() {
    setLoading(true)
    setProducts(await window.byos.stock.products())
    setLoading(false)
  }
  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="space-y-5">
      <PageHeader
        title={lex?.stockNav ?? t({ en: 'Stock', fr: 'Stock' })}
        subtitle={lex?.stockSubtitle}
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} />
            {t({ en: 'Add', fr: 'Ajouter' })} {lex?.productNoun ?? t({ en: 'product', fr: 'produit' })}
          </Button>
        }
      />

      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted">{t({ en: 'Loading…', fr: 'Chargement…' })}</div>
        ) : products.length === 0 ? (
          <EmptyState icon={<Package size={28} />} title={t({ en: 'No products yet', fr: 'Aucun produit' })} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{lex?.productNoun ?? t({ en: 'Product', fr: 'Produit' })}</th>
                  <th>{t({ en: 'Category', fr: 'Catégorie' })}</th>
                  <th className="text-right">{t({ en: 'Cost', fr: 'Coût' })}</th>
                  <th className="text-right">{t({ en: 'Price', fr: 'Prix' })}</th>
                  {tracks && <th className="text-right">{t({ en: 'In stock', fr: 'En stock' })}</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const low = p.trackStock && p.quantity <= p.reorderLevel
                  return (
                    <tr key={p.id}>
                      <td className="font-medium">{p.name}</td>
                      <td className="text-muted">{p.categoryName ?? '—'}</td>
                      <td className="text-right text-muted">
                        {p.costPriceMinor != null ? formatMoney(p.costPriceMinor, cur) : '—'}
                      </td>
                      <td className="text-right">
                        {p.sellingPriceMinor != null ? formatMoney(p.sellingPriceMinor, cur) : '—'}
                      </td>
                      {tracks && (
                        <td className={clsx('text-right font-semibold', low ? 'text-danger' : 'text-ink')}>
                          {p.trackStock ? `${p.quantity} ${p.unit}` : '—'}
                          {low && (
                            <span className="ml-1 text-xs font-normal text-danger">
                              {t({ en: '(low)', fr: '(faible)' })}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="text-right">
                        {tracks && p.trackStock && (
                          <Button size="sm" variant="ghost" onClick={() => setAdjust(p)}>
                            {t({ en: 'Adjust', fr: 'Ajuster' })}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && (
        <ProductForm
          onClose={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false)
            await reload()
          }}
        />
      )}
      {adjust && (
        <AdjustForm
          product={adjust}
          onClose={() => setAdjust(null)}
          onSaved={async () => {
            setAdjust(null)
            await reload()
          }}
        />
      )}
    </div>
  )
}

function ProductForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unit, setUnit] = useState('unit')
  const [cost, setCost] = useState<number>(0)
  const [price, setPrice] = useState<number>(0)
  const [reorder, setReorder] = useState<number>(0)
  const [opening, setOpening] = useState<number>(0)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(undefined)
    if (!name.trim()) {
      setError(t({ en: 'Enter a name.', fr: 'Saisissez un nom.' }))
      return
    }
    setBusy(true)
    const res = await window.byos.stock.createProduct({
      name,
      categoryId: categoryId || null,
      unit,
      costPriceMinor: cost || null,
      sellingPriceMinor: price || null,
      reorderLevel: reorder || 0,
      openingQty: opening || 0
    })
    setBusy(false)
    if (res.ok) onSaved()
    else setError(t({ en: 'Could not save.', fr: "Impossible d'enregistrer." }))
  }

  return (
    <Modal title={t({ en: 'Add product', fr: 'Ajouter un produit' })} onClose={onClose}>
      <div className="space-y-4">
        <FormError message={error} />
        <div>
          <label className="label">{t({ en: 'Name', fr: 'Nom' })}</label>
          <input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t({ en: 'Unit', fr: 'Unité' })}</label>
            <input className="field" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div>
            <label className="label">{t({ en: 'Reorder level', fr: 'Seuil de réappro' })}</label>
            <input className="field" type="number" min={0} value={reorder} onChange={(e) => setReorder(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">{t({ en: 'Cost price', fr: "Prix d'achat" })}</label>
            <input className="field" type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">{t({ en: 'Selling price', fr: 'Prix de vente' })}</label>
            <input className="field" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">{t({ en: 'Opening stock', fr: 'Stock initial' })}</label>
            <input className="field" type="number" min={0} value={opening} onChange={(e) => setOpening(Number(e.target.value))} />
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

function AdjustForm({
  product,
  onClose,
  onSaved
}: {
  product: ProductDTO
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [type, setType] = useState<AdjustStockInput['movementType']>('stock_in')
  const [quantity, setQuantity] = useState<number>(0)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const types: { key: AdjustStockInput['movementType']; label: string }[] = [
    { key: 'stock_in', label: t({ en: 'Stock in (+)', fr: 'Entrée (+)' }) },
    { key: 'stock_out', label: t({ en: 'Stock out (−)', fr: 'Sortie (−)' }) },
    { key: 'damage', label: t({ en: 'Damage / loss (−)', fr: 'Perte / casse (−)' }) },
    { key: 'adjustment', label: t({ en: 'Correction (−)', fr: 'Correction (−)' }) }
  ]

  async function save() {
    setError(undefined)
    if (!(quantity > 0)) {
      setError(t({ en: 'Enter a quantity.', fr: 'Saisissez une quantité.' }))
      return
    }
    setBusy(true)
    const res = await window.byos.stock.adjust({ productId: product.id, movementType: type, quantity, reason: reason || null })
    setBusy(false)
    if (res.ok) onSaved()
    else setError(t({ en: 'Could not adjust stock.', fr: "Impossible d'ajuster le stock." }))
  }

  return (
    <Modal title={`${t({ en: 'Adjust', fr: 'Ajuster' })} — ${product.name}`} onClose={onClose}>
      <div className="space-y-4">
        <FormError message={error} />
        <div className="text-sm text-muted">
          {t({ en: 'Current', fr: 'Actuel' })}: <span className="font-semibold text-ink">{product.quantity} {product.unit}</span>
        </div>
        <div>
          <label className="label">{t({ en: 'Type', fr: 'Type' })}</label>
          <select className="field" value={type} onChange={(e) => setType(e.target.value as AdjustStockInput['movementType'])}>
            {types.map((tp) => (
              <option key={tp.key} value={tp.key}>
                {tp.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t({ en: 'Quantity', fr: 'Quantité' })}</label>
          <input className="field" type="number" min={0} autoFocus value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">{t({ en: 'Reason (optional)', fr: 'Motif (optionnel)' })}</label>
          <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
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
