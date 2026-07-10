import { desc, eq } from 'drizzle-orm'
import { documents } from '#server/schema/documents'

/**
 * GET /api/cv/download — délivre une URL signée courte pour télécharger le CV
 * courant (le plus récent par version) de l'utilisateur (décision SCOPING §3.2 :
 * Blob PRIVÉ, le blobUrl brut n'est JAMAIS renvoyé au client).
 *
 * Auth : `event.context.auth()` (fonction — AGENTS §5.1). userId null = 401.
 *
 * L'URL signée est courte (60s) pour limiter la fenêtre d'exposition (RGPD —
 * PII). Le client suit la redirection/traverse cette URL pour télécharger le PDF.
 */
export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = getDb()
  const [doc] = await db
    .select({ blobUrl: documents.blobUrl, version: documents.version })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.version))
    .limit(1)

  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: 'Aucun CV trouvé.' })
  }

  const url = await getStorageProvider().getSignedDownloadUrl(doc.blobUrl, 60)

  return { url, version: doc.version }
})
