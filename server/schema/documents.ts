import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

/**
 * Documents utilisateur (AGENTS.md §7).
 *
 * F3 : seul `kind='CV'` est géré. Le multi-kind arrivera feature par feature
 * (aucun autre kind prévu dans le cadrage actuel).
 *
 * - `blobUrl` : URL Vercel Blob PRIVÉ (décision SCOPING §3.2 — store privé,
 *   lectures via URLs signées courte durée). Jamais exposée au client (la route
 *   /api/cv/download délivre une URL signée après auth).
 * - `version` : incrémenté à chaque re-upload (max(version du user) + 1).
 * - `parsedAt` : posé par le job `parse-cv` (F4) une fois le parsing terminé.
 *   null = parsing en attente/à venir.
 *
 * Unicité sur `blobUrl` : garantit l'idempotence de `onUploadCompleted` (le
 * webhook Blob peut être réessayé). Le check applicatif précède, mais la
 * contrainte DB est le filet de sécurité contre les races check-then-insert.
 */
export const documentKindEnum = pgEnum('document_kind', ['CV'])

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: documentKindEnum('kind').notNull(),
    blobUrl: text('blob_url').notNull(),
    version: integer('version').notNull().default(1),
    parsedAt: timestamp('parsed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('documents_user_id_idx').on(table.userId),
    unique('documents_blob_url_unique').on(table.blobUrl),
  ],
)

// --- Types dérivés ---

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
