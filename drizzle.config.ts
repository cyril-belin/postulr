import { defineConfig } from 'drizzle-kit'

// Configuration drizzle-kit.
// - generate : crée les fichiers de migration datés dans db/ (à committer)
// - migrate  : applique les migrations à la DB (jamais `push` — AGENTS.md §2/F1 §2)
//
// L'URL vient de NUXT_DATABASE_URL. drizzle-kit charge automatiquement .env.
export default defineConfig({
  schema: './server/schema',
  out: './db',
  dialect: 'postgresql',
  schemaCasing: 'snake_case',
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
