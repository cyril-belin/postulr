import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// --- Enums partagés (cf AGENTS.md §7) ---

export const planEnum = pgEnum('plan', ['free', 'pro'])

export const consentTypeEnum = pgEnum('consent_type', [
  'cv_processing',
  'data_transfer_eu',
  'marketing',
])

// --- Utilisateur ---

export const users = pgTable('users', {
  // id = Clerk userId (texte). Pas de default : créé à l'inscription Clerk.
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  plan: planEnum('plan').notNull().default('free'),
  // F2 : gating onboarding. Le vrai upload CV arrive en F3, qui passera ce
  // flag à true. Pas de dépendance à la table documents (elle n'existe qu'en F3).
  hasCv: boolean('has_cv').notNull().default(false),
  stripeCustomerId: text('stripe_customer_id'),
  billingCurrentPeriodEnd: timestamp('billing_current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// --- Consentements RGPD (AGENTS.md §5.8, SCOPING §3.6) ---
//
// ⚠️ Journal d'audit APPEND-ONLY (décision backlog F2 — consignée SCOPING §3.6) :
// on n'impose PAS de contrainte unique (userId, type). Chaque accord/retrait
// ajoute une ligne, ce qui préserve l'historique complet des consentements
// (exigence RGPD : pouvoir démontrer qui a consenti à quoi et quand). La
// lecture de l'état courant prend la ligne la plus récente par type
// (cf. /api/me qui vérifie la présence d'au moins une ligne de ce type).

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: consentTypeEnum('type').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    ip: text('ip'),
  },
  (table) => [index('consents_user_id_idx').on(table.userId)],
)

// --- Types dérivés ---

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Consent = typeof consents.$inferSelect
export type NewConsent = typeof consents.$inferInsert
