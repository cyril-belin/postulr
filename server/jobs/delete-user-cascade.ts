import { eq } from 'drizzle-orm'
import { consents, users } from '#server/schema/users'

/**
 * Job Inngest `delete-user-cascade` — droit à l'oubli RGPD (SCOPING §3.6).
 *
 * ⚠️ SQUELETTE F2 — complété au fil des features au fur et à mesure que les
 * entités qu'il touche existent (SCOPING §5) :
 *   - F2 (maintenant) : hard-delete users + consents (cascade FK)
 *   - F3 : ajout suppression CV Blob
 *   - F7 : ajout anonymisation applications (count sans PII pour analytics)
 *   - F10 : test E2E Playwright avec le reste de la suite
 *
 * Hard-delete (pas de soft-delete : le droit à l'oubli exige une suppression
 * effective). La fonction est créée via `getInngest().createFunction(...)` au
 * moment de la requête (lazy init du client — runtimeConfig hydratée).
 */
export function makeDeleteUserCascade() {
  return getInngest().createFunction(
    { id: 'delete-user-cascade', retries: 3, triggers: [{ event: 'delete-user-cascade' }] },
    async ({ event, step }) => {
      const { userId } = event.data as { userId: string }

      // Étapes séparées pour observabilité (chacune est retriable indépendamment).
      // La suppression de `users` cascade sur `consents` (FK onDelete: cascade),
      // mais on supprime explicitement les consents d'abord pour la clarté du log.
      await step.run('delete-consents', async () => {
        const db = getDb()
        return db.delete(consents).where(eq(consents.userId, userId))
      })

      await step.run('delete-user', async () => {
        const db = getDb()
        return db.delete(users).where(eq(users.id, userId))
      })

      // TODO F3 : suppression du CV Vercel Blob (via documents.blobUrl).
      // TODO F7 : anonymisation des applications (count sans PII conservé).

      return { userId, deleted: true }
    },
  )
}
