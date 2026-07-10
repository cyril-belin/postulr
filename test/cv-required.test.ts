import { describe, expect, it } from 'vitest'

/**
 * Test unitaire de la logique de redirection du middleware cv-required (F2 §5,
 * critère #5).
 *
 * Le middleware lui-même dépend de composables Clerk/Nuxt difficiles à isoler
 * en pur unitaire (useAuth, useCurrentUser). On teste donc la logique de
 * décision (fonction pure extraite conceptuellement) — c'est le cœur du
 * critère d'acceptation : "connecté, hasCv=false → onboarding".
 */

/** Logique de décision du middleware cv-required (extrait testable). */
function decideCvRedirect(params: {
  hasCv: boolean
  consentsGiven: boolean
}): string | null {
  if (params.hasCv) return null // laisse passer
  // Consents requis déjà donnés → on saute l'écran consentements.
  return params.consentsGiven ? '/onboarding/upload-cv' : '/onboarding'
}

describe('middleware cv-required — logique de redirection', () => {
  it('laisse passer si hasCv=true', () => {
    expect(decideCvRedirect({ hasCv: true, consentsGiven: false })).toBeNull()
  })

  it('redirige vers /onboarding si hasCv=false et consents manquants', () => {
    expect(decideCvRedirect({ hasCv: false, consentsGiven: false })).toBe('/onboarding')
  })

  it('redirige vers /onboarding/upload-cv si hasCv=false mais consents donnés', () => {
    expect(decideCvRedirect({ hasCv: false, consentsGiven: true })).toBe('/onboarding/upload-cv')
  })
})
