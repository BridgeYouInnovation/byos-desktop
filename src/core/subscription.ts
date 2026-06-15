// Subscription constants + status-derivation math (pure). Ported from
// web/src/lib/subscriptions.ts — the calendar-driven transition logic that the
// desktop runs locally on workspace load (and that gating reads offline).

export const PLAN_PRICE_MINOR = 20000
export const PLAN_CURRENCY = 'XAF'
export const GRACE_DAYS = 14
export const EXPIRING_WINDOW_DAYS = 14

export function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}
export function addYears(d: Date, years: number): Date {
  const out = new Date(d)
  out.setFullYear(out.getFullYear() + years)
  return out
}

// Derive the calendar-based subscription status. Admin-forced states
// (suspended/cancelled) are preserved by the caller; this only covers the
// active → expiring → grace → restricted progression once a plan has been paid.
export function deriveSubscriptionStatus(opts: {
  now: Date
  periodEnd: Date | null
  graceEnd?: Date | null
}): 'active' | 'expiring' | 'grace' | 'restricted' | null {
  const { now, periodEnd } = opts
  if (!periodEnd) return null // never paid → keep trial/pending
  const graceEnd = opts.graceEnd ?? addDays(periodEnd, GRACE_DAYS)
  if (now < addDays(periodEnd, -EXPIRING_WINDOW_DAYS)) return 'active'
  if (now < periodEnd) return 'expiring'
  if (now < graceEnd) return 'grace'
  return 'restricted'
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, { en: string; fr: string }> = {
  trial: { en: 'Trial', fr: 'Essai' },
  active: { en: 'Active', fr: 'Actif' },
  expiring: { en: 'Expiring soon', fr: 'Expire bientôt' },
  grace: { en: 'Grace period', fr: 'Délai de grâce' },
  restricted: { en: 'Restricted', fr: 'Restreint' },
  suspended: { en: 'Suspended', fr: 'Suspendu' },
  cancelled: { en: 'Cancelled', fr: 'Annulé' },
  pending: { en: 'Payment pending', fr: 'En attente' }
}
