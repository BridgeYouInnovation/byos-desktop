import { Printer } from 'lucide-react'
import type { RecordDetailDTO, TenantDTO } from '@core/dto'
import { formatMoney, formatDateTime } from '@core/format'
import { useI18n } from '../lib/i18n'
import { Button } from '../ui/ui'

// Receipt slip. The print CSS in globals.css reveals only the .receipt subtree,
// so window.print() prints just this — works with any system/A4 printer now,
// and the same markup feeds the ESC-POS path later (Phase 4 thermal).
export function Receipt({ record, tenant }: { record: RecordDetailDTO; tenant: TenantDTO }) {
  const { t, lang } = useI18n()
  const cur = record.currency || tenant.currency

  return (
    <div>
      <div className="receipt mx-auto max-w-sm rounded-xl border border-line bg-white p-5 text-sm">
        <div className="text-center">
          <div className="text-base font-bold text-ink">{tenant.businessName}</div>
          {tenant.receiptHeader && <div className="text-xs text-muted">{tenant.receiptHeader}</div>}
          {tenant.phone && <div className="text-xs text-muted">{tenant.phone}</div>}
        </div>

        <div className="my-3 border-t border-dashed border-line" />

        <div className="flex justify-between text-xs text-muted">
          <span>{record.recordNumber}</span>
          <span>{formatDateTime(record.recordDate)}</span>
        </div>
        {record.contactName && (
          <div className="mt-1 text-xs text-muted">
            {t({ en: 'Customer', fr: 'Client' })}: {record.contactName}
          </div>
        )}

        <div className="my-3 border-t border-dashed border-line" />

        {record.items.length > 0 ? (
          <table className="w-full text-xs">
            <tbody>
              {record.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-0.5">
                    {it.name}
                    <span className="text-muted"> ×{it.quantity}</span>
                  </td>
                  <td className="py-0.5 text-right">{formatMoney(it.lineTotalMinor, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs">{record.description}</div>
        )}

        <div className="my-3 border-t border-dashed border-line" />

        {record.discountMinor > 0 && (
          <div className="flex justify-between text-xs">
            <span>{t({ en: 'Subtotal', fr: 'Sous-total' })}</span>
            <span>{formatMoney(record.subtotalMinor, cur)}</span>
          </div>
        )}
        {record.discountMinor > 0 && (
          <div className="flex justify-between text-xs">
            <span>{t({ en: 'Discount', fr: 'Remise' })}</span>
            <span>-{formatMoney(record.discountMinor, cur)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-ink">
          <span>{t({ en: 'Total', fr: 'Total' })}</span>
          <span>{formatMoney(record.amountMinor, cur)}</span>
        </div>

        <div className="mt-4 text-center text-xs text-muted">
          {t({ en: 'Thank you!', fr: 'Merci !' })}
        </div>
      </div>

      <div className="no-print mt-4 flex justify-end">
        <Button onClick={() => window.print()}>
          <Printer size={15} />
          {lang === 'fr' ? 'Imprimer' : 'Print'}
        </Button>
      </div>
    </div>
  )
}
