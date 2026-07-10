/**
 * Interface du provider de stockage (AGENTS.md §5.5).
 *
 * Abstraction pour découpler le métier du backend concret (Vercel Blob). Aucun
 * code hors de `server/utils/storage/` n'importe `@vercel/blob` directement
 * (anti-pattern §10).
 *
 * Mode PRIVÉ (décision SCOPING §3.2) : les blobs ne sont pas publiquement
 * accessibles. Toute lecture passe par `getSignedDownloadUrl()` qui délivre une
 * URL signée à durée courte. Le `blobUrl` brut n'est jamais renvoyé au client.
 */
export interface StorageProvider {
  /**
   * Supprime un blob par son URL.
   * Utilisé par le job RGPD `delete-user-cascade` (droit à l'oubli).
   */
  delete(blobUrl: string): Promise<void>

  /**
   * Récupère les métadonnées d'un blob (existe ?, taille, contentType).
   * `null` si le blob n'existe pas.
   */
  head(blobUrl: string): Promise<{ size: number; contentType: string } | null>

  /**
   * Délivre une URL signée à durée courte pour télécharger un blob privé.
   * Appelée par une route authentifiée (ex. /api/cv/download) — jamais le
   * blobUrl brut n'est exposé au client.
   *
   * @param blobUrl URL du blob (privée).
   * @param expiresInSec Durée de validité de l'URL signée (défaut court).
   */
  getSignedDownloadUrl(blobUrl: string, expiresInSec?: number): Promise<string>
}

/** Erreur de base du provider de stockage — pour typage partagé. */
export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
  }
}
