import { describe, expect, it } from 'vitest'
import {
  CV_ALLOWED_CONTENT_TYPES,
  CV_MAX_SIZE_BYTES,
  nextVersion,
  validateUploadRequest,
} from '#server/utils/cv-upload'

/**
 * Tests de la logique de validation de l'upload CV (F3 §5, critères #2/#3).
 *
 * Règle F3 : tests = code réel. On importe les fonctions de production
 * (server/utils/cv-upload.ts) appelées par onBeforeGenerateToken dans
 * /api/cv/upload.post.ts. Aucune fonction de décision définie dans test/.
 *
 * Propriétés testées :
 *   - Garde d'auth (userId null → 401).
 *   - Allowlist content-type (non-PDF → 400).
 *   - Taille max 5 Mo (> → 413).
 */

const PDF = 'application/pdf'

describe('validateUploadRequest — garde d\'authentification', () => {
  it('rejette sans userId (401)', () => {
    const res = validateUploadRequest({ userId: null, contentType: PDF, sizeInBytes: 1000 })
    expect(res.ok).toBe(false)
    expect(res.statusCode).toBe(401)
  })

  it('accepte avec un userId valide', () => {
    const res = validateUploadRequest({ userId: 'user_abc', contentType: PDF, sizeInBytes: 1000 })
    expect(res.ok).toBe(true)
  })
})

describe('validateUploadRequest — allowlist content-type', () => {
  it('rejette un content-type non-PDF (400)', () => {
    const res = validateUploadRequest({
      userId: 'user_abc',
      contentType: 'image/png',
      sizeInBytes: 1000,
    })
    expect(res.ok).toBe(false)
    expect(res.statusCode).toBe(400)
  })

  it('rejette un content-type absent (400)', () => {
    const res = validateUploadRequest({ userId: 'user_abc', contentType: undefined, sizeInBytes: 1000 })
    expect(res.ok).toBe(false)
    expect(res.statusCode).toBe(400)
  })

  it('accepte uniquement application/pdf', () => {
    expect(CV_ALLOWED_CONTENT_TYPES).toEqual(['application/pdf'])
  })
})

describe('validateUploadRequest — taille max', () => {
  it('rejette > 5 Mo (413)', () => {
    const res = validateUploadRequest({
      userId: 'user_abc',
      contentType: PDF,
      sizeInBytes: CV_MAX_SIZE_BYTES + 1,
    })
    expect(res.ok).toBe(false)
    expect(res.statusCode).toBe(413)
  })

  it('accepte exactement 5 Mo (limite incluse)', () => {
    const res = validateUploadRequest({
      userId: 'user_abc',
      contentType: PDF,
      sizeInBytes: CV_MAX_SIZE_BYTES,
    })
    expect(res.ok).toBe(true)
  })

  it('accepte une taille non spécifiée (vérifiée côté Blob)', () => {
    const res = validateUploadRequest({ userId: 'user_abc', contentType: PDF, sizeInBytes: undefined })
    expect(res.ok).toBe(true)
  })

  it('constante de taille = 5 Mo', () => {
    expect(CV_MAX_SIZE_BYTES).toBe(5 * 1024 * 1024)
  })
})

/**
 * Critère d'acceptation #4 : version = max(version du user) + 1.
 */
describe('nextVersion — incrément de version CV', () => {
  it('premier CV → version 1', () => {
    expect(nextVersion(0)).toBe(1)
  })

  it('re-upload → version max + 1', () => {
    expect(nextVersion(3)).toBe(4)
  })

  it('version jamais négative ni nulle', () => {
    expect(nextVersion(0)).toBeGreaterThanOrEqual(1)
    expect(nextVersion(10)).toBe(11)
  })
})
