import { serve } from 'inngest/nuxt'
import { getInngest } from '#server/utils/inngest'
import { makeDeleteUserCascade } from '#server/jobs/delete-user-cascade'

/**
 * Endpoint unique Inngest (AGENTS.md §5.6).
 *
 * F2 : register le job `delete-user-cascade` (RGPD). Les fonctions sont créées
 * via `getInngest().createFunction(...)` au moment de la requête (lazy init du
 * client — la runtimeConfig doit être hydratée).
 */
export default defineEventHandler((event) => {
  const client = getInngest()
  const functions = [makeDeleteUserCascade()]
  return serve({ client, functions })(event)
})
