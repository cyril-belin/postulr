import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

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
  stripeCustomerId: text('stripe_customer_id'),
  billingCurrentPeriodEnd: timestamp('billing_current_period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// --- Consentements RGPD (AGENTS.md §5.8, SCOPING §3.6) ---

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
