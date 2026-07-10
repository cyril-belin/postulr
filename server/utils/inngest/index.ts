import { Inngest, type Inngest as InngestClient } from 'inngest'

/**
 * Client Inngest partagé (singleton). Les fonctions (server/jobs/*) sont
 * créées séparément et registered dans server/api/inngest.ts.
 *
 * En F1 : aucune fonction n'existe encore — l'endpoint /api/inngest sert une
 * liste vide (placeholder qui boote sans crash, AGENTS.md §5.6).
 *
 * `isDev` route les events vers le dev server local (localhost:8288) au lieu
 * d'Inngest Cloud. Piloté par NUXT_INNGEST_DEV via runtimeConfig (jamais
 * `process.env` direct — AGENTS.md §5.1, anti-pattern §10).
 *
 * Initialisation lazy : le client est créé au premier accès (pendant le
 * traitement d'une requête, quand la runtimeConfig est hydratée). Lire
 * `useRuntimeConfig()` au moment de l'import du module (boot) renvoie des
 * valeurs non-hydratées → on diffère.
 */
let _client: InngestClient | null = null

function createInngest(): InngestClient {
  const config = useRuntimeConfig()
  // Nuxt/`untyped` peuvent coercer `NUXT_INNGEST_DEV=1` en number au runtime
  // bien que le type soit `string`. On normalise en string avant de comparer.
  return new Inngest({
    id: 'postulr',
    isDev: String(config.inngestDev) === '1',
  })
}

/** Singleton Inngest — crée l'instance au premier appel. */
export function getInngest(): InngestClient {
  if (!_client) _client = createInngest()
  return _client
}
