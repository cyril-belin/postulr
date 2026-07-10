/**
 * Logique de redirection du middleware cv-required (extrait pour test — backlog F2 #2).
 *
 * Testable indépendamment des composables Clerk/Nuxt. Importée par le middleware
 * (app/middleware/cv-required.ts) ET par les tests (règle F3 : tests = code réel).
 *
 * @returns Cible de redirection, ou `null` pour laisser passer.
 */
export function decideCvRedirect(params: { hasCv: boolean, consentsGiven: boolean }): string | null {
  if (params.hasCv) return null // laisse passer
  // Consents requis déjà donnés → on saute l'écran consentements.
  return params.consentsGiven ? '/onboarding/upload-cv' : '/onboarding'
}
