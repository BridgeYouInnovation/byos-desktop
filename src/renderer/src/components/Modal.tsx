import { type ReactNode } from 'react'
import { X } from 'lucide-react'

// Lightweight centered modal used by the record/stock/people forms and the
// receipt preview. The .no-print class keeps controls out of printed receipts.
export function Modal({
  title,
  onClose,
  children,
  size = 'md'
}: {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 no-print"
      onMouseDown={onClose}
    >
      <div
        className={
          'my-8 w-full rounded-2xl bg-white shadow-soft ' + (size === 'lg' ? 'max-w-3xl' : 'max-w-lg')
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
