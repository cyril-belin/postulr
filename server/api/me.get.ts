import { eq } from 'drizzle-orm'
import { consents, users } from '#server/schema/users'

/**
 * GET /api/me — profil de l'utilisateur courant pour le composable
 * useCurrentUser() (plan, hasCv, consents). Pas d'info PII au-delà de l'email
 * (déjà connu du client via Clerk).
 *
 * Auth : `event.context.auth()` est une FONCTION (AGENTS §5.1, doc Clerk Nuxt
 * vérifiée 2026-07-10). userId null = 401.
 */
export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = getDb()

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      plan: users.plan,
      hasCv: users.hasCv,
    })
    .from(users)
    .where(eq(users.id, userId))

  // L'utilisateur existe côté Clerk (session valide) mais pas encore en base :
  // le webhook user.created n'est pas encore arrivé. On renvoie un profil par
  // défaut plutôt qu'un 404 — le front affichera l'état "en cours de création".
  if (!user) {
    return {
      id: userId,
      email: null,
      plan: 'free' as const,
      hasCv: false,
      consents: { cvProcessing: false, dataTransferEu: false, marketing: false },
    }
  }

  const userConsents = await db.select({ type: consents.type }).from(consents).where(eq(consents.userId, userId))

  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
    hasCv: user.hasCv,
    consents: {
      cvProcessing: userConsents.some((c) => c.type === 'cv_processing'),
      dataTransferEu: userConsents.some((c) => c.type === 'data_transfer_eu'),
      marketing: userConsents.some((c) => c.type === 'marketing'),
    },
  }
})
