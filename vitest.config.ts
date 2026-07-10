import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

// Config Vitest — environnement Nuxt via @nuxt/test-utils (AGENTS.md §1).
// F1 : config prête, 0 test. Les tests arrivent feature par feature.
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
