/**
 * POST /api/account/delete — droit à l'oubli RGPD (SCOPING §3.6).
 *
 * Émet l'event Inngest `delete-user-cascade` qui hard-delete en cascade.
 * La route ne fait QUE déclencher le job (evite le timeout serverless — la
 * cascade peut être longue une fois complète : CV Blob + applications en F3/F7).
 *
 * F2 : le handler Inngest supprime users + consents seulement. La route
 * renvoie 202 Accepted (le traitement est asynchrone).
 */
export default defineEventHandler(async (event) => {
  const { userId } = event.context.auth()
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  await getInngest().send({
    name: 'delete-user-cascade',
    data: { userId },
  })

  setResponseStatus(event, 202)
  return { scheduled: true }
})
