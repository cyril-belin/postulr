/**
 * Logique de décision de l'upload CV (extrait pour test — règle F3 : tests = code réel).
 *
 * Ces fonctions pures encapsulent les gardes de sécurité et la logique de
 * versioning du CV. Elles sont appelées par la server route
 * (server/api/cv/upload.post.ts) et testées directement — pas de duplication
 * dans les fichiers de test.
 *
 * Constantes de sécurité : taille max + allowlist content-type (cf AGENTS §5.2).
 */

/** Taille max d'un CV : 5 Mo (AGENTS.md §5.2). */
export const CV_MAX_SIZE_BYTES = 5 * 1024 * 1024

/** Allowlist stricte du content-type (PDF uniquement — AGENTS.md §5.2). */
export const CV_ALLOWED_CONTENT_TYPES = ['application/pdf']

/** Résultat du garde de validation d'upload. */
export interface UploadValidation {
  ok: boolean
  /** Code HTTP de rejet éventuel (ignoré si ok). */
  statusCode?: number
  /** Message de rejet éventuel. */
  statusMessage?: string
}

/**
 * Valide une requête d'upload (côté serveur, AVANT génération du token).
 *
 * Garde en 3 points (le contenu ne peut pas être forgé par le client côté Blob) :
 *   1. Utilisateur authentifié (userId requis).
 *   2. Content-type dans l'allowliste (PDF uniquement).
 *   3. Taille ≤ 5 Mo.
 *
 * @returns `{ ok: true }` ou `{ ok: false, statusCode, statusMessage }`.
 */
export function validateUploadRequest(params: {
  userId: string | null
  contentType: string | undefined
  sizeInBytes: number | undefined
}): UploadValidation {
  if (!params.userId) {
    return { ok: false, statusCode: 401, statusMessage: 'Unauthorized' }
  }
  if (!params.contentType || !CV_ALLOWED_CONTENT_TYPES.includes(params.contentType)) {
    return { ok: false, statusCode: 400, statusMessage: 'Seuls les fichiers PDF sont acceptés.' }
  }
  if (params.sizeInBytes !== undefined && params.sizeInBytes > CV_MAX_SIZE_BYTES) {
    return { ok: false, statusCode: 413, statusMessage: 'Le CV dépasse la taille maximale de 5 Mo.' }
  }
  return { ok: true }
}

/**
 * Calcule le numéro de version du prochain CV (version = max(version du user) + 1).
 *
 * @param currentMaxVersion Plus haute version existante pour l'utilisateur (0 si aucun CV).
 * @returns Version du nouvel upload (≥ 1).
 */
export function nextVersion(currentMaxVersion: number): number {
  return currentMaxVersion + 1
}

/**
 * Supprime best-effort une liste de blobs Blob (RGPD — delete-user-cascade).
 *
 * Un blob déjà supprimé ne fait pas échouer l'opération : le droit à l'oubli
 * exige de compléter la cascade (user + données DB) même si un blob est absent.
 * Les erreurs sont renvoyées dans le résultat pour observabilité (logguées par
 * l'appelant), pas levées.
 *
 * @param blobUrls URLs des blobs à supprimer.
 * @param deleter Fonction de suppression (storageProvider.delete) — injectée
 *   pour testabilité (mock dans les tests, réel en prod).
 */
export async function deleteBlobsBestEffort(
  blobUrls: string[],
  deleter: (blobUrl: string) => Promise<void>,
): Promise<{ deletedCount: number, failures: string[] }> {
  const failures: string[] = []
  await Promise.all(
    blobUrls.map(async (url) => {
      try {
        await deleter(url)
      } catch {
        failures.push(url)
      }
    }),
  )
  return { deletedCount: blobUrls.length - failures.length, failures }
}
