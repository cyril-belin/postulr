import { consents } from '#server/schema/users'
import { onboardingConsentsSchema } from '#shared/utils/schemas'

/**
 * POST /api/onboarding/consents — enregistre les consentements RGPD (F2 §2,
 * SCOPING §3.6). Schéma partagé app↔server dans shared/utils/schemas.ts.
 *
 * - cv_processing + data_transfer_eu sont REQUIS (refus → 400).
 * - marketing est optionnel.
 * - On n'insère QUE les consentements accordés (absence = refus).
 * - IP tracée (getRequestIP avec xForwardedFor derrière Vercel — vérifié h3 v1).
 */
export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readValidatedBody(event, onboardingConsentsSchema.parse)

  // Garde RGPD : les deux consentements requis doivent être accordés.
  if (!body.cvProcessing || !body.dataTransferEu) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Les consentements de traitement CV et de transfert hors-UE sont requis.',
    })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
  const db = getDb()

  // On insère chaque consentement accordé. `marketing` n'est inséré que si true.
  const granted = [
    { type: 'cv_processing' as const, ok: body.cvProcessing },
    { type: 'data_transfer_eu' as const, ok: body.dataTransferEu },
    { type: 'marketing' as const, ok: body.marketing },
  ].filter((c) => c.ok)

  if (granted.length > 0) {
    await db.insert(consents).values(
      granted.map((c) => ({
        userId,
        type: c.type,
        ip,
      })),
    )
  }

  setResponseStatus(event, 201)
  return {
    consents: {
      cvProcessing: body.cvProcessing,
      dataTransferEu: body.dataTransferEu,
      marketing: body.marketing,
    },
  }
})
