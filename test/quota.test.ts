import { describe, expect, it } from 'vitest'
import { checkQuota, decrementQuota, type QuotaFeature } from '#server/utils/quota'

/**
 * Tests du stub quota (F3). Interface stable — F10 remplacera le corps sans
 * changer les signatures.
 */

describe('quota stub (F3)', () => {
  it('checkQuota autorise toujours (stub)', async () => {
    const features: QuotaFeature[] = ['cv_parse', 'pack', 'auto_apply']
    for (const feature of features) {
      const result = await checkQuota('user_abc', feature)
      expect(result.allowed).toBe(true)
    }
  })

  it('checkQuota ne lève jamais (stub permissif)', async () => {
    await expect(checkQuota('user_x', 'cv_parse')).resolves.not.toThrow()
  })

  it('decrementQuota est no-op (stub, ne lève pas)', async () => {
    await expect(decrementQuota('user_abc', 'cv_parse')).resolves.toBeUndefined()
  })
})
