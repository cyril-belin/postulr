/**
 * Middleware `cv-required` (named) — connecté mais hasCv=false → redirection
 * vers l'onboarding (F2 §2). S'applique au dashboard via definePageMeta.
 *
 * Logique de redirection (extraction backlog F2 #2 — fonction pure testable
 * dans app/utils/cv-redirect.ts, importée par les tests = code réel) :
 *   - consents non donnés (cvProcessing false) → /onboarding (écran consentements)
 *   - consents donnés mais hasCv=false → /onboarding/upload-cv (upload réel F3)
 *
 * Ce middleware suppose que `auth` a déjà tourné (on est authentifié). On
 * attend que le profil DB soit chargé avant de décider (sinon hasCv inconnu).
 *
 * (review F2 issue #4) : `refresh()` peut reject (401 si la session Clerk n'est
 * pas encore propagée côté server pendant le SSR, ou erreur réseau). On wrappe
 * pour éviter que le middleware ne crash — en cas d'échec, on redirige vers
 * l'onboarding (valeur par défaut sûre) plutôt que de propager une 500.
 */
import { decideCvRedirect } from '~/utils/cv-redirect'

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

  const consentsGiven = consents.value.cvProcessing && consents.value.dataTransferEu
  const target = decideCvRedirect({ hasCv: hasCv.value, consentsGiven })
  return target ? navigateTo(target) : undefined
})
