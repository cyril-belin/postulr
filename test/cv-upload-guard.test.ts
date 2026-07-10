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
  it('rejette un content-type explicite non-PDF (400)', () => {
    const res = validateUploadRequest({
      userId: 'user_abc',
      contentType: 'image/png',
      sizeInBytes: 1000,
    })
    expect(res.ok).toBe(false)
    expect(res.statusCode).toBe(400)
  })

  it('accepte un content-type absent — enforcement délégué à Blob (undefined = non connu)', () => {
    // Nouveau contrat (corrige le bloquant review externe PR #2) : `undefined`
    // = non vérifiable à ce stade (onBeforeGenerateToken ne connaît pas encore
    // le type du fichier). L'allowlist est enforced côté Blob via
    // allowedContentTypes (que le client ne peut pas forcer). Le rejet 400 ne
    // s'applique qu'à une valeur EXPLICITE hors allowlist.
    const res = validateUploadRequest({ userId: 'user_abc', contentType: undefined, sizeInBytes: 1000 })
    expect(res.ok).toBe(true)
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

/**
 * Test du CALL SITE réel (corrige le bloquant review externe PR #2).
 *
 * Tester la fonction isolément ne suffit pas — il faut aussi tester l'appel
 * TEL QUE le code de prod le fait. `onBeforeGenerateToken` dans
 * /api/cv/upload.post.ts appelle `validateUploadRequest` avec EXACTEMENT
 * `{ userId, contentType: undefined, sizeInBytes: undefined }` (le fichier
 * n'est pas encore uploadé à ce stade). Avant le fix, ce call site renvoyait
 * systématiquement `{ ok: false, 400 }` → aucun upload n'était possible.
 *
 * Ce test protège la composition route ↔ garde, pas la fonction seule.
 */
describe('validateUploadRequest — call site réel (onBeforeGenerateToken)', () => {
  it('accepte les arguments exacts que la route passe (userId + undefined/undefined)', () => {
    const res = validateUploadRequest({
      userId: 'user_abc',
      contentType: undefined,
      sizeInBytes: undefined,
    })
    expect(res.ok).toBe(true)
  })

  it('rejette le call site sans userId (401, garde d\'auth)', () => {
    // userId null = event.context.auth() sans session valide.
    const res = validateUploadRequest({
      userId: null,
      contentType: undefined,
      sizeInBytes: undefined,
    })
    expect(res.ok).toBe(false)
    expect(res.statusCode).toBe(401)
  })
})
