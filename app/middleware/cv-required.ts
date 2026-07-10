/**
 * Middleware `cv-required` (named) — connecté mais hasCv=false → redirection
 * vers l'onboarding (F2 §2). S'applique au dashboard via definePageMeta.
 *
 * Logique de redirection :
 *   - consents non donnés (cvProcessing false) → /onboarding (écran consentements)
 *   - consents donnés mais hasCv=false → /onboarding/upload-cv (placeholder F2,
 *     vrai upload en F3)
 *
 * Ce middleware suppose que `auth` a déjà tourné (on est authentifié). On
 * attend que le profil DB soit chargé avant de décider (sinon hasCv inconnu).
 */
export default defineNuxtRouteMiddleware(async () => {
  const { isLoaded, isSignedIn } = useAuth()
  const { hasCv, consents, refresh } = useCurrentUser()

  // Si Clerk n'est pas encore chargé ou pas authentifié, on laisse `auth`
  // gérer (ce middleware s'exécute après `auth` dans la chaîne).
  if (!isLoaded.value || !isSignedIn.value) return

  // S'assurer d'avoir le profil DB. useFetch peut ne pas avoir tourné si on
  // arrive directement sur /dashboard (SSR initial).
  await refresh()

  if (hasCv.value) return // OK, l'utilisateur a un CV → on laisse passer.

  // Pas de CV → onboarding. Si les consentements RGPD requis sont déjà donnés,
  // on saute l'écran de consentements et on va directement au placeholder upload.
  const consentsGiven = consents.value.cvProcessing && consents.value.dataTransferEu
  return navigateTo(consentsGiven ? '/onboarding/upload-cv' : '/onboarding')
})
