// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['shadcn-nuxt', '@nuxt/eslint'],

  // Tailwind v4 — CSS-first config, no tailwind.config.ts.
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  // shadcn-nuxt — registers the `app/components/ui/` directory for auto-import.
  shadcn: {
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
