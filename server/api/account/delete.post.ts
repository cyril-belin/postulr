/**
 * POST /api/account/delete — droit à l'oubli RGPD (SCOPING §3.6).
 *
 * Émet l'event Inngest `delete-user-cascade` qui hard-delete en cascade.
 * La route ne fait QUE déclencher le job (evite le timeout serverless — la
 * cascade peut être longue une fois complète : CV Blob + applications en F3/F7).
 *
 * F2 : le handler Inngest supprime users + consents seulement. La route
 * renvoie 202 Accepted (le traitement est asynchrone).
 *
 * (review F2 issue #8) : l'envoi Inngest est wrappé — si Inngest est down, on
 * renvoie 503 clair plutôt qu'un 500 générique, pour que le client puisse
 * réessayer proprement.
 */
export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    await getInngest().send({
      name: 'delete-user-cascade',
      data: { userId },
    })
  } catch (err) {
    console.error('[account/delete] Inngest send error', { userId, error: err })
    throw createError({ statusCode: 503, statusMessage: 'Service temporairement indisponible, réessayez.' })
  }

  setResponseStatus(event, 202)
  return { scheduled: true }
})
