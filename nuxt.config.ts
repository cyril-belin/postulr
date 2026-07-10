// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['shadcn-nuxt', '@clerk/nuxt', '@nuxt/eslint'],

  // Clerk (doc vérifiée 2026-07-10 — @clerk/nuxt auto-configure middleware +
  // plugins + composants auto-importés : SignedIn/SignedOut/UserButton/SignIn...).
  // Clés lues depuis runtimeConfig (vars d'env NUXT_*_CLERK_* déjà posées en F1).
  // Redirections post-auth → onboarding (le vrai upload CV arrive en F3).
  // Noms de champs = API Clerk SDK v3 (signUpFallbackRedirectUrl, etc.).
  clerk: {
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    signInFallbackRedirectUrl: '/onboarding',
    signUpFallbackRedirectUrl: '/onboarding',
  },

  // Tailwind v4 — CSS-first config, no tailwind.config.ts.
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  // shadcn-nuxt — registers the `app/components/ui/` directory for auto-import.
  // ⚠️ prefix: '' OBLIGATOIRE — sans ça, shadcn-nuxt préfixe tous les composants
  // avec "Ui" (UiButton, UiCheckbox...) au lieu de Button, Checkbox. Les
  // templates utilisent <Button>, <Card>, <Checkbox> sans préfixe (convention
  // shadcn-vue). Ce bug rendait TOUS les composants ui invisibles (custom
  // elements non résolus) — découvert via l'onboarding F3 où les checkboxes
  // n'apparaissaient pas.
  shadcn: {
    prefix: '',
    componentDir: '~/components/ui',
  },

  typescript: {
    strict: true,
    typeCheck: false, // typecheck runs via `nuxt typecheck` in the quality gate
  },

  // All secrets/keys flow through runtimeConfig — never `process.env` in routes.
  // Public keys are prefixed NUXT_PUBLIC_ and exposed to the client.
  runtimeConfig: {
    databaseUrl: '',
    clerkSecretKey: '',
    clerkWebhookSecret: '',
    blobReadWriteToken: '',
    openaiApiKey: '',
    inngestEventKey: '',
    inngestSigningKey: '',
    inngestDev: '', // INNGEST_DEV=1 en dev local — flag non-secret du SDK
    franceTravailClientId: '',
    franceTravailClientSecret: '',
    adzunaAppId: '',
    adzunaApiKey: '',
    public: {
      clerkPublishableKey: '',
      appUrl: '',
    },
  },
})
