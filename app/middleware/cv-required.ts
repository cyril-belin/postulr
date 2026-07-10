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
 *
 * (review F2 issue #4) : `refresh()` peut reject (401 si la session Clerk n'est
 * pas encore propagée côté server pendant le SSR, ou erreur réseau). On wrappe
 * pour éviter que le middleware ne crash — en cas d'échec, on redirige vers
 * l'onboarding (valeur par défaut sûre) plutôt que de propager une 500.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { isLoaded, isSignedIn } = useAuth()
  const { hasCv, consents, refresh } = useCurrentUser()

  // Si Clerk n'est pas encore chargé ou pas authentifié, on laisse `auth`
  // gérer (ce middleware s'exécute après `auth` dans la chaîne).
  if (!isLoaded.value || !isSignedIn.value) return

  // S'assurer d'avoir le profil DB. useFetch peut ne pas avoir tourné si on
  // arrive directement sur /dashboard (SSR initial).
  try {
    await refresh()
  } catch {
    // Échec du fetch profil (401 transitoire, réseau) : on redirige vers
    // l'onboarding plutôt que de crasher. L'utilisateur pourra re-tenter.
    return navigateTo('/onboarding')
  }

  if (hasCv.value) return // OK, l'utilisateur a un CV → on laisse passer.

  // Pas de CV → onboarding. Si les consentements RGPD requis sont déjà donnés,
  // on saute l'écran de consentements et on va directement au placeholder upload.
  const consentsGiven = consents.value.cvProcessing && consents.value.dataTransferEu
  return navigateTo(consentsGiven ? '/onboarding/upload-cv' : '/onboarding')
})
