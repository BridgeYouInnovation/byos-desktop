// Subscription-driven access gating (pure). Ported from web/src/lib/tenant.ts
// (resolveAccess + ACCESS_BANNERS), decoupled from the Prisma Tenant type so it
// runs identically against a local SQLite row. This is the trial/restricted
// gating the desktop must honor offline.
import type { Lang } from './i18n'

export type SubscriptionAccess = {
  status: string
  canView: boolean // can read workspace
  canCreate: boolean // can create financial records (sales/income/expenses) — paid feature
  canManageUsers: boolean // can invite users & manage roles — paid feature
  canManageBilling: boolean
  banner: { tone: 'info' | 'warning' | 'danger'; message: string } | null
}

const ACCESS_BANNERS = {
  en: {
    trial:
      "You're on a free trial — set up your products and contacts now. Subscribe (20,000 XAF/year) to record sales and manage your team.",
    expiring: 'Your subscription is expiring soon. Renew to avoid interruption.',
    grace: "Your subscription has expired. You're in a grace period, renew now to stay active.",
    restricted:
      'Your subscription has expired. Records are read-only until you renew (20,000 XAF/year).',
    suspended: 'This business has been suspended. Please contact BridgeYou support.',
    cancelled: 'This business account has been cancelled.',
    default: 'Complete your subscription payment to unlock full access.'
  },
  fr: {
    trial:
      'Vous êtes en essai gratuit — configurez vos produits et contacts dès maintenant. Abonnez-vous (20 000 XAF/an) pour enregistrer des ventes et gérer votre équipe.',
    expiring: 'Votre abonnement expire bientôt. Renouvelez-le pour éviter toute interruption.',
    grace:
      'Votre abonnement a expiré. Vous êtes en période de grâce, renouvelez maintenant pour rester actif.',
    restricted:
      "Votre abonnement a expiré. Les registres sont en lecture seule jusqu'au renouvellement (20 000 XAF/an).",
    suspended: 'Cette entreprise a été suspendue. Veuillez contacter le support BridgeYou.',
    cancelled: "Ce compte d'entreprise a été annulé.",
    default: "Effectuez le paiement de votre abonnement pour débloquer l'accès complet."
  }
} as const

// Resolve subscription-driven access state from a tenant's subscriptionStatus.
export function resolveAccess(status: string, lang: Lang = 'en'): SubscriptionAccess {
  const b = ACCESS_BANNERS[lang]
  switch (status) {
    case 'active':
      return {
        status,
        canView: true,
        canCreate: true,
        canManageUsers: true,
        canManageBilling: true,
        banner: null
      }
    case 'trial':
      // Free trial: explore + set up the business (stock, contacts), but
      // recording and user management are reserved for paid plans.
      return {
        status,
        canView: true,
        canCreate: false,
        canManageUsers: false,
        canManageBilling: true,
        banner: { tone: 'info', message: b.trial }
      }
    case 'expiring':
      return {
        status,
        canView: true,
        canCreate: true,
        canManageUsers: true,
        canManageBilling: true,
        banner: { tone: 'warning', message: b.expiring }
      }
    case 'grace':
      return {
        status,
        canView: true,
        canCreate: true,
        canManageUsers: true,
        canManageBilling: true,
        banner: { tone: 'warning', message: b.grace }
      }
    case 'restricted':
      return {
        status,
        canView: true,
        canCreate: false,
        canManageUsers: false,
        canManageBilling: true,
        banner: { tone: 'danger', message: b.restricted }
      }
    case 'suspended':
      return {
        status,
        canView: false,
        canCreate: false,
        canManageUsers: false,
        canManageBilling: true,
        banner: { tone: 'danger', message: b.suspended }
      }
    case 'cancelled':
      return {
        status,
        canView: false,
        canCreate: false,
        canManageUsers: false,
        canManageBilling: false,
        banner: { tone: 'danger', message: b.cancelled }
      }
    default:
      return {
        status,
        canView: true,
        canCreate: false,
        canManageUsers: false,
        canManageBilling: true,
        banner: { tone: 'warning', message: b.default }
      }
  }
}
