import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'
import { config as loadEnv } from 'dotenv'

// Charger .env avant que l'environnement Nuxt (qui boot le plugin client Clerk)
// ne se lance — sinon @clerk/nuxt lève "Missing publishableKey" au boot du test.
loadEnv()

// Config Vitest — environnement Nuxt via @nuxt/test-utils (AGENTS.md §1).
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app/', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared/', import.meta.url)),
    },
  },
})
