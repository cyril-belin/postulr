import { desc, eq } from 'drizzle-orm'
import { handleUpload } from '@vercel/blob/client'
import { documents } from '#server/schema/documents'
import { users } from '#server/schema/users'
import {
  CV_ALLOWED_CONTENT_TYPES,
  CV_MAX_SIZE_BYTES,
  nextVersion,
  validateUploadRequest,
} from '#server/utils/cv-upload'

/**
 * POST /api/cv/upload — orchestre l'upload direct navigateur → Vercel Blob
 * (AGENTS.md §5.2, décision SCOPING §3.2 : store PRIVÉ).
 *
 * Flux client-upload (doc Vercel Blob vérifiée 2026-07-10, @vercel/blob 2.x) :
 *   1. Le navigateur POST vers cette route via `upload()` de `@vercel/blob/client`.
 *   2. `handleUpload()` détermine l'action (générer token vs upload terminé) et
 *      appelle le bon callback.
 *   3. `onBeforeGenerateToken` tourne pendant la requête authentifiée user →
 *      `event.context.auth()` (FONCTION — AGENTS §5.1) pour le userId, garde
 *      de sécurité (PDF + 5 Mo), contrôle quota. Renvoie `tokenPayload` (userId)
 *      transmis à `onUploadCompleted`.
 *   4. `onUploadCompleted` est un WEBHOOK de Vercel Blob (signé, PAS de session
 *      Clerk) → on lit le userId depuis `tokenPayload`. Persiste `documents`
 *      (version = max+1, parsedAt null), passe `users.hasCv` à true, émet
 *      l'event Inngest `cv/uploaded` (handler `parse-cv` stub F4).
 *
 * ⚠️ `handleUpload` est conçue pour Next (attend un Web Request). On adapte
 * l'event H3 via `toWebRequest(event)` (helper h3).
 *
 * ⚠️ Dev local : `onUploadCompleted` est appelé PAR les serveurs Vercel → ne
 * peut PAS atteindre localhost sans tunnel (voir README). Sans tunnel, le
 * webhook ne fire pas → pas de ligne `documents`, hasCv reste false.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = await handleUpload({
    token: useRuntimeConfig(event).blobReadWriteToken,
    request: toWebRequest(event),
    body,
    onBeforeGenerateToken: async (_pathname: string, _clientPayload: string | null, _multipart: boolean) => {
      // Auth : event capturé en closure = la requête courante (génération de
      // token). event.context.auth() est une FONCTION (AGENTS §5.1).
      const { userId } = event.context.auth()

      // Garde de sécurité centralisé (cf #server/utils/cv-upload.ts, testé).
      // Le contentType/taille ne sont pas connus ici (le client n'a pas encore
      // uploadé) : on délègue l'application à Blob via allowedContentTypes/
      // maximumSizeInBytes (le client ne peut pas les forger).
      const guard = validateUploadRequest({ userId, contentType: undefined, sizeInBytes: undefined })
      if (!guard.ok) {
        throw createError({ statusCode: guard.statusCode!, statusMessage: guard.statusMessage })
      }
      // Après le garde, userId est garanti non-null (guard renvoie 401 sinon).
      // TS ne le déduit pas (le garde est dans une fonction séparée) → assertion.
      const validUserId = userId!

      // Quota (stub F3 — always-allow ; F10 remplacera le corps).
      const quota = await checkQuota(validUserId, 'cv_parse')
      if (!quota.allowed) {
        throw createError({ statusCode: 429, statusMessage: 'Quota de re-parsing atteint.' })
      }

      return {
        // Allowlist + taille : Blob rejette tout upload hors-cadre côté serveur.
        allowedContentTypes: CV_ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: CV_MAX_SIZE_BYTES,
        addRandomSuffix: true, // évite l'écrasement entre versions
        // userId transmis au webhook onUploadCompleted (pas de session Clerk là).
        tokenPayload: JSON.stringify({ userId: validUserId }),
      }
    },
    onUploadCompleted: async ({ blob, tokenPayload }: { blob: { url: string, pathname: string }, tokenPayload?: string | null }) => {
      // Webhook Blob (signé) → pas de session Clerk. userId vient du tokenPayload
      // posé dans onBeforeGenerateToken.
      const { userId } = (tokenPayload ? JSON.parse(tokenPayload) : {}) as { userId?: string }
      if (!userId) {
        // Pas de userId = tokenPayload corrompu. On lève une erreur (pas
        // createError — ce n'est PAS un handler h3, mais un callback webhook
        // Blob). Le throw signale à Blob de réessayer l'onUploadCompleted.
        console.error('[cv/upload] onUploadCompleted sans userId', { blobUrl: blob.url })
        throw new Error('Missing userId in tokenPayload')
      }

      const db = getDb()

      // IDEMPOTENCE : onUploadCompleted peut être appelé plusieurs fois par Blob
      // si le webhook est réessayé (réseau, 500 transitoire). On garde l'unicité
      // par blobUrl : si ce blob est déjà persisté pour l'user, on ack sans
      // réinsérer ni réémettre l'event (sinon doublon documents + parsing x2).
      const [existing] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.blobUrl, blob.url))
        .limit(1)
      if (existing) {
        console.info('[cv/upload] onUploadCompleted déjà traité (idempotent)', { blobUrl: blob.url })
        return
      }

      // Version = max(version du user) + 1. Re-upload → version incrémentée.
      const [latest] = await db
        .select({ version: documents.version })
        .from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(desc(documents.version))
        .limit(1)
      const version = nextVersion(latest?.version ?? 0)

      await db.insert(documents).values({
        userId,
        kind: 'CV',
        blobUrl: blob.url,
        version,
        parsedAt: null,
      })

      // Gating (correctif vs F2) : le middleware cv-required lit users.hasCv,
      // PAS l'existence d'une ligne documents. C'est ici qu'on pose hasCv=true.
      await db.update(users).set({ hasCv: true }).where(eq(users.id, userId))

      // Déclenche le parsing (stub F4 — no-op loggé pour l'instant).
      try {
        await getInngest().send({
          name: 'cv/uploaded',
          data: { userId, documentId: blob.pathname, blobUrl: blob.url, version },
        })
      } catch (err) {
        // L'event Inngest peut échouer sans invalider l'upload (le CV est stocké).
        // On logge ; le parsing pourra être relancé manuellement. Pas de throw
        // (sinon Blob retry tout l'onUploadCompleted → doublon documents).
        console.error('[cv/upload] Inngest send error', { userId, error: err })
      }
    },
  })

  return result
})
