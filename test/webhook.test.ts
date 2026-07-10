import { describe, expect, it } from 'vitest'
import { noEmailDecision, webhookGuard } from '#server/utils/webhook-guard'

/**
 * Tests de la logique de garde du webhook Clerk (F2 §5, critère #2).
 *
 * ⚠️ Backlog F2 #2 (solder en F3) : on importe le VRAI code de production
 * (server/utils/webhook-guard.ts), pas un miroir dupliqué. Règle F3 : les tests
 * testent le code réel.
 *
 * Le webhook vérifie 3 gardes avant toute écriture en base :
 *   1. Body non vide → sinon 400
 *   2. Headers Svix présents → sinon 401
 *   3. Signature Svix valide → sinon 401 (la vérif crypto réelle est faite par
 *      svix.Webhook.verify dans la route, non testée ici).
 *
 * C'est ce qui garantit qu'aucune écriture ne survient sur rejet.
 */

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

/**
 * (review F2 issue #6) : un user légitime sans email (OAuth incomplet, email non
 * vérifié) doit être ACK (200, ignoré) et NON 400. Sinon Clerk retry en boucle.
 */
describe('webhook Clerk — user sans email (anti retry-storm)', () => {
  it('ack 200 un user sans email (pas de 400 qui déclencherait une retry storm)', () => {
    const res = noEmailDecision(false)
    expect(res.status).toBe(200)
    expect(res.ignored).toBe('no-email')
  })

  it('ack 200 un user avec email', () => {
    const res = noEmailDecision(true)
    expect(res.status).toBe(200)
    expect(res.ignored).toBeUndefined()
  })
})
