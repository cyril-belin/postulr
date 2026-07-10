import { describe, expect, it } from 'vitest'

/**
 * Smoke test — valide que le harnais Vitest + environnement Nuxt fonctionne.
 * F1 : c'est le seul test (config prête, 0 test métier). Les tests métier
 * arrivent feature par feature.
 */
describe('vitest harness', () => {
  it('runs assertions', () => {
    expect(1 + 1).toBe(2)
  })
})
