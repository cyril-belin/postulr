/**
 * Middleware `auth` (named) — protège /dashboard/** et /onboarding/**.
 * Non connecté → redirection vers /sign-in.
 *
 * Pattern doc Clerk Nuxt vérifié 2026-07-10 : useAuth() refs, on garde
 * `isLoaded` pour éviter un flash avant hydratation.
 */
export default defineNuxtRouteMiddleware(() => {
  const { isLoaded, isSignedIn } = useAuth()

  if (isLoaded.value && !isSignedIn.value) {
    return navigateTo('/sign-in')
  }
})
