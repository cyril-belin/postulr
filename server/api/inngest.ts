import { serve } from 'inngest/nuxt'
import { getInngest } from '#server/utils/inngest'

/**
 * Endpoint unique Inngest (AGENTS.md §5.6).
 *
 * En F1 : `functions: []` — placeholder valide qui boote sans crash et
 * register zéro fonction. Les premières fonctions arrivent en F3/F5.
 *
 * Le client est résolu via `getInngest()` au moment de la requête (lazy init)
 * pour s'assurer que la runtimeConfig est hydratée.
 */
export default defineEventHandler((event) => {
  const client = getInngest()
  return serve({ client, functions: [] })(event)
})
