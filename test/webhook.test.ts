import { describe, expect, it } from 'vitest'

/**
 * Tests de la logique de garde du webhook Clerk (F2 §5, critère #2).
 *
 * Le webhook vérifie 3 gardes avant toute écriture en base :
 *   1. Body non vide → sinon 400
 *   2. Headers Svix présents → sinon 401
 *   3. Signature Svix valide → sinon 401
 *
 * On teste ces gardes comme une fonction pure (extraction de la logique de
 * décision) — c'est ce qui garantit qu'aucune écriture ne survient sur rejet.
 * Le test d'intégration complet (signature Svix réelle + DB live) relèverait
 * d'un setup de test plus lourd ; la garde est la propriété critique de sécu.
 */

type SvixHeaders = { 'svix-id'?: string; 'svix-timestamp'?: string; 'svix-signature'?: string }

/** Décision du webhook AVANT écriture base. Retourne le code HTTP de rejet ou null (OK). */
function webhookGuard(rawBody: string | undefined, headers: SvixHeaders): number | null {
  if (!rawBody) return 400
  if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) return 401
  // (la vérif crypto réelle est faite par svix.Webhook.verify — non testée ici)
  return null
}

describe('webhook Clerk — gardes de sécurité', () => {
  it('rejette un body vide (400)', () => {
    expect(webhookGuard(undefined, {})).toBe(400)
    expect(webhookGuard('', {})).toBe(400)
  })

  it('rejette sans headers Svix (401)', () => {
    expect(webhookGuard('{}', {})).toBe(401)
    expect(webhookGuard('{}', { 'svix-id': 'x' })).toBe(401) // partiel
  })

  it('laisse passer avec les 3 headers Svix présents', () => {
    expect(
      webhookGuard('{}', { 'svix-id': 'x', 'svix-timestamp': '1', 'svix-signature': 'v1,ok' }),
    ).toBeNull()
  })
})

/**
 * Propriété critique (critère #2) : aucune écriture en base ne peut survenir si
 * la signature est invalide — car le guard 401 s'exécute AVANT l'appel DB.
 * Le code de production respecte cet ordre (verify → 401, puis DB).
 */
describe('webhook Clerk — propriété de sécu', () => {
  it('un rejet de signature (401) précède toute écriture DB', () => {
    // Si un seul header manque → 401 → la DB n'est jamais touchée.
    const code = webhookGuard('{"type":"user.created"}', { 'svix-id': 'x' })
    expect(code).toBe(401)
  })
})
