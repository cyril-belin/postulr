import { z } from 'zod'

/**
 * Schémas Zod partagés app ↔ server (AGENTS.md §2 : shared/utils/ auto-importé
 * des deux côtés). Pas d'import Vue ou Nitro ici.
 */

// --- Consentements RGPD (SCOPING.md §3.6, AGENTS.md §5.8) ---
// cv_processing + data_transfer_eu sont requis ; marketing est optionnel.
// `required` est dérivé côté route, pas stocké.

export const consentTypeEnum = z.enum(['cv_processing', 'data_transfer_eu', 'marketing'])
export type ConsentType = z.infer<typeof consentTypeEnum>

/** Corps attendu par POST /api/onboarding/consents. */
export const onboardingConsentsSchema = z.object({
  cvProcessing: z.boolean(),
  dataTransferEu: z.boolean(),
  marketing: z.boolean(),
})
export type OnboardingConsents = z.infer<typeof onboardingConsentsSchema>
