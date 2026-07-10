/**
 * useCurrentUser() — expose l'état utilisateur courant (auth + profil DB) de
 * façon SSR-safe. Utilisé par les middlewares et les pages (F2 §2).
 *
 * - L'auth vient de Clerk (`useAuth`/`useUser` — auto-importés par @clerk/nuxt).
 * - Le profil DB (plan, hasCv, consents) vient de GET /api/me via useFetch
 *   (évite le double-fetch SSR+hydration — AGENTS §5.3).
 *
 * (review F2 issue #5) : pas de watchEffect auto-refresh — le refresh est
 * piloté explicitement par les middlewares/pages qui en ont besoin (ex.
 * cv-required.ts après auth). Ça évite les double-fetch et les race conditions
 * entre watchEffect et refresh() explicite.
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

  // Fetch du profil DB. `key` unique pour le cache useAsyncData (partagé entre
  // tous les appelants du composable). `immediate: false` — on ne fetch qu'à la
  // demande (middleware/pages appellent refresh() après auth confirmée).
  const { data, refresh } = useFetch<MeResponse>('/api/me', {
    key: 'current-user',
    immediate: false,
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
