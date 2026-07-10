/**
 * useCurrentUser() — expose l'état utilisateur courant (auth + profil DB) de
 * façon SSR-safe. Utilisé par les middlewares et les pages (F2 §2).
 *
 * - L'auth vient de Clerk (`useAuth`/`useUser` — auto-importés par @clerk/nuxt).
 * - Le profil DB (plan, hasCv, consents) vient de GET /api/me via useFetch
 *   (évite le double-fetch SSR+hydration — AGENTS §5.3). On ne déclenche le
 *   fetch que si l'utilisateur est authentifié (sinon 401 inutile).
 */
interface ConsentsState {
  cvProcessing: boolean
  dataTransferEu: boolean
  marketing: boolean
}

interface MeResponse {
  id: string
  email: string | null
  plan: 'free' | 'pro'
  hasCv: boolean
  consents: ConsentsState
}

const DEFAULT_CONSENTS: ConsentsState = {
  cvProcessing: false,
  dataTransferEu: false,
  marketing: false,
}

export const useCurrentUser = () => {
  const { isSignedIn } = useAuth()
  const { user } = useUser()

  // Fetch du profil DB — seulement si authentifié. `key` unique pour le cache
  // useAsyncData (partagé entre tous les appelants du composable).
  const { data, refresh } = useFetch<MeResponse>('/api/me', {
    key: 'current-user',
    // On ne fetch pas tant que Clerk n'a pas confirmé l'auth (isLoaded && isSignedIn).
    immediate: false,
  })

  // Déclencher le fetch réactivement quand l'utilisateur devient authentifié.
  // Gardé simple : le middleware/pages appellent refresh() explicitement quand
  // nécessaire (ex. après onboarding).
  watchEffect(() => {
    if (isSignedIn.value && !data.value) {
      refresh()
    }
  })

  const plan = computed(() => data.value?.plan ?? 'free')
  const hasCv = computed(() => data.value?.hasCv ?? false)
  const consents = computed<ConsentsState>(() => data.value?.consents ?? DEFAULT_CONSENTS)
  const email = computed(() => user.value?.primaryEmailAddress?.emailAddress ?? data.value?.email ?? null)

  return {
    isAuthed: isSignedIn,
    email,
    plan,
    hasCv,
    consents,
    refresh,
  }
}
