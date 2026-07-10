/**
 * Job Inngest `parse-cv` — parsing IA du CV uploadé.
 *
 * ⚠️ STUB F3 : no-op loggé. La vraie implémentation arrive en F4 :
 *   - récupère le PDF via URL signée (StorageProvider.getSignedDownloadUrl),
 *   - appelle le LlmProvider avec le prompt de parsing,
 *   - valide la sortie par Zod (AGENTS §5.5),
 *   - persiste le profil (experiences, skills, etc.) en base,
 *   - pose `documents.parsedAt = now`.
 *
 * On garde le stub ici pour que l'event `cv/uploaded` ait un handler registered
 * (sinon Inngest le marque "no listener"). L'event est déclenché par
 * onUploadCompleted de /api/cv/upload.
 *
 * Créé via `getInngest().createFunction(...)` au moment de la requête (lazy init
 * du client — runtimeConfig hydratée), comme `delete-user-cascade`.
 */
export function makeParseCv() {
  return getInngest().createFunction(
    { id: 'parse-cv', retries: 3, triggers: [{ event: 'cv/uploaded' }] },
    async ({ event, step }) => {
      const { userId, blobUrl, version } = event.data as {
        userId: string
        blobUrl: string
        version: number
      }

      await step.run('log-received', async () => {
        // STUB : on logge juste la réception. F4 fera le vrai parsing.
        console.info('[parse-cv] CV reçu, parsing en attente (F4)', {
          userId,
          blobUrl,
          version,
        })
        return { stub: true, scheduledFor: 'F4' }
      })

      // TODO F4 : télécharger le PDF (URL signée), parser via LlmProvider,
      // valider la sortie Zod, persister le profil, poser parsedAt.

      return { userId, parsed: false, reason: 'stub-F4' }
    },
  )
}
