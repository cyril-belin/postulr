import { desc, eq } from 'drizzle-orm'
import { documents } from '#server/schema/documents'

/**
 * GET /api/cv — liste des CV de l'utilisateur courant (section « Mes CV » du
 * dashboard). Triés par version décroissante (le plus récent en premier).
 *
 * ⚠️ Ne renvoie PAS le blobUrl brut (Blob privé — SCOPING §3.2). Le
 * téléchargement passe par GET /api/cv/download qui délivre une URL signée.
 * On n'expose que les métadonnées (version, parsedAt, createdAt).
 *
 * Auth : `event.context.auth()` (fonction — AGENTS §5.1). userId null = 401.
 */
export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = getDb()
  const docs = await db
    .select({
      id: documents.id,
      version: documents.version,
      parsedAt: documents.parsedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.version))

  // Le statut de parsing dérivé : parsed si parsedAt non null, pending sinon.
  return {
    documents: docs.map((d) => ({
      id: d.id,
      version: d.version,
      status: d.parsedAt ? ('parsed' as const) : ('pending' as const),
      createdAt: d.createdAt,
    })),
  }
})
