import { eq } from 'drizzle-orm'
import { consents, users } from '#server/schema/users'
import { documents } from '#server/schema/documents'
import { deleteBlobsBestEffort } from '#server/utils/cv-upload'

/**
 * Job Inngest `delete-user-cascade` — droit à l'oubli RGPD (SCOPING §3.6).
 *
 * ⚠️ SQUELETTE progressivement complété au fil des features (SCOPING §5) :
 *   - F2 : hard-delete users + consents (cascade FK)
 *   - F3 (maintenant) : suppression CV Blob AVANT le delete user
 *   - F7 : ajout anonymisation applications (count sans PII pour analytics)
 *   - F10 : test E2E Playwright avec le reste de la suite
 *
 * Hard-delete (pas de soft-delete : le droit à l'oubli exige une suppression
 * effective). L'ORDRE compte : on supprime les blobs Blob AVANT le delete user,
 * car la cascade FK emporte `documents` (sinon on perd les blobUrl à libérer).
 *
 * La fonction est créée via `getInngest().createFunction(...)` au moment de la
 * requête (lazy init du client — runtimeConfig hydratée).
 */
export function makeDeleteUserCascade() {
  return getInngest().createFunction(
    { id: 'delete-user-cascade', retries: 3, triggers: [{ event: 'delete-user-cascade' }] },
    async ({ event, step }) => {
      const { userId } = event.data as { userId: string }

      // 1. Récupérer les documents AVANT le delete user (la cascade FK emporte
      //    documents, on perdrait les blobUrl à libérer). Étape séparée pour
      //    observabilité (retriable indépendamment).
      const docs = await step.run('fetch-documents', async () => {
        const db = getDb()
        const rows = await db
          .select({ blobUrl: documents.blobUrl })
          .from(documents)
          .where(eq(documents.userId, userId))
        return rows.map((r) => r.blobUrl)
      })

      // 2. Supprimer chaque blob Blob. Doit précéder le delete user (cf. ordre).
      await step.run('delete-cv-blobs', async () => {
        const storage = getStorageProvider()
        // Best-effort : un blob déjà supprimé ne doit pas faire échouer la
        // cascade (RGPD : l'important est de supprimer l'user + ses données DB).
        const result = await deleteBlobsBestEffort(docs, (url) => storage.delete(url))
        if (result.failures.length > 0) {
          console.warn('[delete-user-cascade] blob delete failures', { failures: result.failures })
        }
        return { deletedBlobCount: result.deletedCount }
      })

      // 3. Suppression explicite des consents (la cascade FK le ferait aussi,
      //    mais c'est plus clair dans les logs et retriable isolément).
      await step.run('delete-consents', async () => {
        const db = getDb()
        return db.delete(consents).where(eq(consents.userId, userId))
      })

      // 4. Hard-delete user → cascade sur documents (déjà vidés côté Blob).
      await step.run('delete-user', async () => {
        const db = getDb()
        return db.delete(users).where(eq(users.id, userId))
      })

      // TODO F7 : anonymisation des applications (count sans PII conservé).

      return { userId, deleted: true, blobsDeleted: docs.length }
    },
  )
}
