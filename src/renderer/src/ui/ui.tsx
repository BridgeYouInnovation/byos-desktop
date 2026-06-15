import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Design-system primitives, ported from web/src/components/ui.tsx. The web
// LinkButton (next/link) is replaced by a plain <button> Button here.

export function Badge({
  tone = 'gray',
  children
}: {
  tone?: 'gray' | 'green' | 'blue' | 'amber' | 'red' | 'navy'
  children: ReactNode
}) {
  const tones: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-600',
    green: 'bg-success-50 text-success',
    blue: 'bg-brand-50 text-brand',
    amber: 'bg-accent-50 text-amber-700',
    red: 'bg-danger-50 text-danger',
    navy: 'bg-slate-800 text-white'
  }
  return <span className={clsx('badge', tones[tone])}>{children}</span>
}

const STATUS_TONES: Record<string, 'gray' | 'green' | 'blue' | 'amber' | 'red'> = {
  active: 'green',
  trial: 'blue',
  expiring: 'amber',
  grace: 'amber',
  restricted: 'red',
  suspended: 'red',
  cancelled: 'gray',
  pending: 'amber',
  paid: 'green',
  partial: 'amber',
  unpaid: 'red'
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONES[status] ?? 'gray'
  const text = label ?? status.replace(/_/g, ' ')
  return <Badge tone={tone}>{text.charAt(0).toUpperCase() + text.slice(1)}</Badge>
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('card', className)}>{children}</div>
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'green' | 'red' | 'amber'
  icon?: ReactNode
}) {
  const toneClass: Record<string, string> = {
    default: 'text-ink',
    green: 'text-success',
    red: 'text-danger',
    amber: 'text-amber-600'
  }
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
        {icon && <div className="text-slate-300">{icon}</div>}
      </div>
      <div className={clsx('mt-2 text-2xl font-bold', toneClass[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon
}: {
  title: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="mb-1 text-slate-300">{icon}</div>}
      <div className="text-base font-semibold text-ink">{title}</div>
      {description && <div className="max-w-sm text-sm text-muted">{description}</div>}
    </div>
  )
}

export function Banner({
  tone = 'info',
  children,
  action
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success'
  children: ReactNode
  action?: ReactNode
}) {
  const tones: Record<string, string> = {
    info: 'bg-brand-50 text-brand border-brand/20',
    warning: 'bg-accent-50 text-amber-700 border-accent/30',
    danger: 'bg-danger-50 text-danger border-danger/20',
    success: 'bg-success-50 text-success border-success/20'
  }
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium',
        tones[tone]
      )}
    >
      <span>{children}</span>
      {action}
    </div>
  )
}

export function Button({
  variant = 'primary',
  size,
  className,
  children,
  ...rest
}: {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm'
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)}
      {...rest}
    >
      {children}
    </button>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-danger/20 bg-danger-50 px-3 py-2 text-sm font-medium text-danger">
      {message}
    </div>
  )
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-success/20 bg-success-50 px-3 py-2 text-sm font-medium text-success">
      {message}
    </div>
  )
}
