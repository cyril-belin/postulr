import type { StorageProvider } from './types'
import { VercelBlobStorage } from './vercel-blob'

/**
 * Factory du StorageProvider (AGENTS.md §5.5).
 *
 * Auto-importé par Nitro depuis `server/utils/` — consommable directement comme
 * `getStorageProvider()` dans toute route/middleware/job serveur.
 *
 * Le provider concret est choisi selon la runtimeConfig (pour l'instant
 * Vercel Blob uniquement — l'abstraction permet d'en ajouter d'autres sans
 * toucher au métier). Initialisation lazy : créé au premier accès (runtimeConfig
 * hydratée), comme `getDb()`/`getInngest()`.
 *
 * Note : `StorageProvider`/`StorageError` ne sont PAS ré-exportés ici — Nitro
 * les auto-importe déjà depuis `./types` (ré-exporter créerait un import dupliqué).
 */
let _provider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (!_provider) {
    const config = useRuntimeConfig()
    _provider = new VercelBlobStorage(config.blobReadWriteToken)
  }
  return _provider
}
