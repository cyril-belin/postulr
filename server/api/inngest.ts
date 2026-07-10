import { serve } from 'inngest/nuxt'
import { getInngest } from '#server/utils/inngest'
import { makeDeleteUserCascade } from '#server/jobs/delete-user-cascade'
import { makeParseCv } from '#server/jobs/parse-cv'

/**
 * Endpoint unique Inngest (AGENTS.md §5.6).
 *
 * Register toutes les fonctions Inngest. F2 : `delete-user-cascade` (RGPD).
 * F3 : `parse-cv` (stub — impl F4). Les fonctions sont créées via
 * `getInngest().createFunction(...)` au moment de la requête (lazy init du
 * client — la runtimeConfig doit être hydratée).
 */
export default defineEventHandler((event) => {
  const client = getInngest()
  const functions = [makeDeleteUserCascade(), makeParseCv()]
  return serve({ client, functions })(event)
})
