import { count } from 'drizzle-orm'
import { users } from '#server/schema/users'

/**
 * Healthcheck de fumée : valide que le client Drizzle est auto-importé depuis
 * server/utils/db et que la connexion Neon fonctionne.
 *
 * Conservé en permanence (sert de healthcheck côté Vercel). Critère F1 #5.
 * ⚠️ F2 TODO : protéger cette route (derrière auth ou limiter l'info exposée)
 * une fois Clerk en place — `userCount` ne doit pas fuiter en prod publique.
 */
export default defineEventHandler(async () => {
  const [row] = await getDb().select({ n: count() }).from(users)
  return { ok: true, userCount: row?.n ?? 0 }
})
