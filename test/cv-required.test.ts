import { describe, expect, it } from 'vitest'
import { decideCvRedirect } from '~/utils/cv-redirect'

/**
 * Test unitaire de la logique de redirection du middleware cv-required
 * (F2 §5, critère #5).
 *
 * ⚠️ Backlog F2 #2 (solder en F3) : on importe le VRAI code de production
 * (app/utils/cv-redirect.ts), pas un miroir dupliqué. Règle F3 : les tests
 * testent le code réel.
 *
 * Le middleware lui-même dépend de composables Clerk/Nuxt difficiles à isoler
 * en pur unitaire (useAuth, useCurrentUser). On teste donc la logique de
 * décision — c'est le cœur du critère d'acceptation : "connecté, hasCv=false → onboarding".
 */

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
