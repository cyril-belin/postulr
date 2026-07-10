/**
 * Garde de sécurité du webhook Clerk (extrait pour test — backlog F2 #2).
 *
 * Cette logique de décision précède TOUTE écriture en base : c'est la propriété
 * critique de sécu du webhook. L'extraire permet aux tests d'importer le VRAI
 * code de production plutôt qu'un miroir dupliqué (règle F3 : tests = code réel).
 *
 * (cf server/api/clerk/webhook.post.ts : ordre body → headers → signature.)
 */

type SvixHeaders = { 'svix-id'?: string, 'svix-timestamp'?: string, 'svix-signature'?: string }

/**
 * Décision du webhook AVANT écriture base.
 * @returns Code HTTP de rejet, ou `null` si les gardes passent (OK).
 */
export function webhookGuard(rawBody: string | undefined, headers: SvixHeaders): number | null {
  if (!rawBody) return 400
  if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) return 401
  // (la vérif crypto réelle est faite par svix.Webhook.verify — non testée ici)
  return null
}

/**
 * Décision pour un user légitime sans email (OAuth incomplet, email non vérifié).
 * Doit être ACK 200 (pas 400) — sinon Clerk retry en boucle (review F2 issue #6).
 */
export function noEmailDecision(hasEmail: boolean): { status: number, ignored?: string } {
  if (!hasEmail) return { status: 200, ignored: 'no-email' }
  return { status: 200 }
}
