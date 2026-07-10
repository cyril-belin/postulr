import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from '#server/schema'

/**
 * Singleton du client Drizzle (driver Neon HTTP serverless).
 *
 * Auto-importé par Nitro depuis `server/utils/` — consommable directement comme
 * `db` dans toute route/middleware/plugin serveur (AGENTS.md §5.4). Le schéma
 * est importé via l'alias `#server` (non auto-importé) et passé à `drizzle()`
 * pour activer les relational queries.
 *
 * L'URL de connexion vient de `runtimeConfig.databaseUrl` (NUXT_DATABASE_URL),
 * jamais de `process.env` direct (AGENTS.md §5.1, anti-pattern §10).
 *
 * Initialisation lazy : le client est créé au premier accès (pendant le
 * traitement d'une requête, quand la runtimeConfig est hydratée). Lire
 * `useRuntimeConfig()` au moment de l'import du module (boot) renvoie des
 * valeurs non-hydratées → on diffère.
 */
let _db: NeonHttpDatabase<typeof schema> | null = null

function createDb(): NeonHttpDatabase<typeof schema> {
  const config = useRuntimeConfig()
  const sql = neon(config.databaseUrl)
  return drizzle({ client: sql, schema })
}

/** Singleton Drizzle — crée l'instance au premier appel. */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) _db = createDb()
  return _db
}

export type Database = NeonHttpDatabase<typeof schema>
