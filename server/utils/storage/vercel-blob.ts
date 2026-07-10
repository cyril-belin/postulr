import { del, head, issueSignedToken, presignUrl } from '@vercel/blob'
import type { StorageProvider } from './types'
import { StorageError } from './types'

/**
 * Implémentation Vercel Blob du StorageProvider (AGENTS.md §5.5).
 *
 * Mode PRIVÉ (décision SCOPING §3.2) : le store Blob est privé. Les lectures
 * passent par `issueSignedToken` + `presignUrl(operation: 'get')` qui délivrent
 * une URL signée à durée courte. Aucun code hors de ce dossier n'importe
 * `@vercel/blob` (anti-pattern §10).
 *
 * Le read-write token vient de `runtimeConfig.blobReadWriteToken`
 * (NUXT_BLOB_READ_WRITE_TOKEN), jamais de `process.env` direct (AGENTS §5.1).
 */
export class VercelBlobStorage implements StorageProvider {
  constructor(private readonly token: string) {
    if (!token) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN manquant (runtimeConfig.blobReadWriteToken)')
    }
  }

  async delete(blobUrl: string): Promise<void> {
    await del(blobUrl, { token: this.token })
  }

  async head(blobUrl: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const blob = await head(blobUrl, { token: this.token })
      return { size: blob.size, contentType: blob.contentType }
    } catch (err) {
      // BlobNotFoundError → le blob n'existe pas (déjà supprimé, jamais créé).
      if (err instanceof Error && err.name === 'BlobNotFound') return null
      throw err
    }
  }

  async getSignedDownloadUrl(blobUrl: string, expiresInSec = 60): Promise<string> {
    // Délivre un token de délégation court (scope: lecture de ce pathname),
    // puis pré-signe l'URL de téléchargement. La durée est calée courte (60s
    // par défaut) pour limiter la fenêtre d'exposition (RGPD — données PII).
    const pathname = blobUrlToPathname(blobUrl)
    const validUntil = Date.now() + expiresInSec * 1000

    const signedToken = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil,
      token: this.token,
    })

    const { presignedUrl } = await presignUrl(signedToken, {
      operation: 'get',
      pathname,
      access: 'private',
      validUntil,
    })
    return presignedUrl
  }
}

/**
 * Extrait le pathname d'une URL Blob Vercel.
 * Ex : `https://xxx.public.blob.vercel-storage.com/users/uid/cv.pdf` → `users/uid/cv.pdf`
 *
 * Le pathname est ce qui est signé par `issueSignedToken`/`presignUrl` — il doit
 * correspondre exactement au path stocké côté Blob.
 */
function blobUrlToPathname(blobUrl: string): string {
  try {
    const url = new URL(blobUrl)
    // Retire le "/" initial : le pathname Blob est relatif (sans slash leading).
    return url.pathname.slice(1)
  } catch {
    throw new StorageError(`blobUrl invalide : ${blobUrl}`)
  }
}
