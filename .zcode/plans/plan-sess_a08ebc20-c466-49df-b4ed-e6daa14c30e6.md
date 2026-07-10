# F1 — Setup projet Postulr

Plan d'exécution pour la feature d'amorce. Tous faits techniques **vérifiés via doc officielle / MCP Nuxt le 2026-07-10** (pas mémoire) : Tailwind **v4** CSS-first via plugin `@tailwindcss/vite`, shadcn-vue style `new-york`, Drizzle+Neon via `neon-http`, Inngest `serve()` object-form depuis `inngest/nuxt`.

## Décisions actées (avec l'utilisateur)
- **DB** : l'utilisateur a une connection string Neon → on fait `generate` **et** `migrate` (critère #4 ✓).
- **Health route** : on la **garde en permanence** (devient healthcheck prod), pas juste pour le smoke test.
- **Git** : `git init` à la racine → commit docs sur `main` → branche `F1-setup-projet`.
- **Package manager** : **npm**.

## Étapes

### 1. Git + bootstrap Nuxt
- `git init` à la racine, `.gitignore` (node_modules, .nuxt, .output, .env, dist), commit initial des docs existantes (AGENTS.md, SCOPING.md, prompts/) sur `main`, puis `git checkout -b F1-setup-projet`.
- `nuxi init` ne copie rien dans un dossier non-vide (vérifié) → on init dans `/tmp/postulr-init` puis on fusionne les fichiers générés (`package.json`, `nuxt.config.ts`, `tsconfig.json`, `app/`, `public/`, etc.) dans `/Users/cyril/dev/postulr` **en préservant** AGENTS.md / SCOPING.md / prompts/.

### 2. Tailwind v4 (CSS-first, pas de tailwind.config.ts)
- `npm i -D tailwindcss @tailwindcss/vite`
- `app/assets/css/tailwind.css` : `@import "tailwindcss";` (+ design tokens ajoutés par la CLI shadcn à l'étape 4).
- `nuxt.config.ts` : `css: ['~/assets/css/tailwind.css']` + `vite.plugins: [tailwindcss()]`.

### 3. Module shadcn-nuxt
- `npx nuxi@latest module add shadcn-nuxt` → `modules: ['shadcn-nuxt']` + `shadcn: { prefix: '', componentDir: '@/components/ui' }`.
- `npx nuxi prepare` (régénère `.nuxt/tsconfig.json` pour les alias).

### 4. shadcn-vue init + primitives (source de vérité = ce que la CLI écrit)
- `npx shadcn-vue@latest init` (base color Neutral, style `new-york`, `cssVariables: true`). La CLI écrit `components.json` (aliases `@/components/ui`, css `app/assets/css/tailwind.css`, tsConfigPath `.nuxt/tsconfig.json`) et injecte les tokens `:root`/`.dark`/`@theme inline` dans `tailwind.css`.
- `npx shadcn-vue@latest add button card input label` → `app/components/ui/{button,card,input,label}/`.
- **On ne modifie pas** le format CSS sorti par la CLI (HSL ou oklch selon base color) — on le documente tel quel dans `ui-registry.md`.

### 5. Runtime config (toutes les var AGENTS.md §9)
`nuxt.config.ts` → `runtimeConfig` privé (DATABASE_URL, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, BLOB_READ_WRITE_TOKEN, OPENAI_API_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY, FRANCE_TRAVAIL_CLIENT_ID/SECRET, ADZUNA_APP_ID/API_KEY) + `public` (CLERK_PUBLISHABLE_KEY, APP_URL). `.env.example` documente chacune (vide en dév).

### 6. Drizzle + Neon (API vérifiée)
- `npm i drizzle-orm @neondatabase/serverless` ; `npm i -D drizzle-kit`.
- `server/schema/users.ts` : `users` (id text PK, email notNull, plan enum `'free'|'pro'` default `'free'`, stripeCustomerId text?, billingCurrentPeriodEnd timestamptz?, createdAt timestamptz defaultNow) + `consents` (id uuid defaultRandom PK, userId text FK→users onDelete cascade, type enum `cv_processing|data_transfer_eu|marketing`, grantedAt timestamptz defaultNow, ip text?) + index sur `consents(userId)`. Enums via `pgEnum`.
- `server/schema/index.ts` : barrel re-export.
- `drizzle.config.ts` : `defineConfig({ schema: './server/schema', out: './db', dialect: 'postgresql', dbCredentials: { url: process.env.NUXT_DATABASE_URL! }, schemaCasing: 'snake_case' })`.
- `server/utils/db/index.ts` : singleton `db = drizzle({ client: neon(runtimeConfig.databaseUrl), schema })` (auto-importé Nitro). Lecture via `useRuntimeConfig`.

### 7. Migration (generate + migrate, jamais push)
- `npx drizzle-kit generate` → fichier daté dans `db/`.
- `npx drizzle-kit migrate` (l'utilisateur fournira `NUXT_DATABASE_URL` via `.env`) → apply sur branch Neon (critère #3 et #4 ✓).

### 8. Inngest placeholder (API vérifiée : object-form serve, empty functions OK)
- `npm i inngest`.
- `server/utils/inngest/index.ts` : `export const inngest = new Inngest({ id: 'postulr' })`.
- `server/api/inngest.ts` : `defineEventHandler(serve({ client: inngest, functions: [] }))` avec `import { serve } from 'inngest/nuxt'`. Boot sans crash (critère #6 ✓).

### 9. Health route (gardée)
- `server/api/health.get.ts` : compte les `users`, renvoie `{ ok: true, userCount }`. Valide l'auto-import de `db` (critère #5 ✓).

### 10. App shell
- `app/app.vue` : `<NuxtLayout><NuxtPage/></NuxtLayout>`.
- `app/error.vue` : page d'erreur globale (Card shadcn).
- `app/layouts/default.vue` : header minimal (logo + nav placeholder) + `<slot/>`.
- `app/layouts/auth.vue` : centré + `<slot/>`.
- `app/pages/index.vue` : landing (hero + CTA vers `/dashboard`, lien volontairement cassé en F1).

### 11. Vitest (config prête, 0 test)
- `npm i -D vitest @vue/test-utils @nuxt/test-utils jsdom`.
- `vitest.config.ts` : environnement `nuxt` via `@nuxt/test-utils`, `include: ['test/**/*.test.ts']`.

### 12. ESLint (flat config Nuxt)
- `npm i -D eslint eslint-plugin-vue @nuxt/eslint` (+ config flat `eslint.config.mjs` via `@nuxt/eslint`).

### 13. `ui-registry.md` initial
Documente : tokens (light/dark tels que sortis par la CLI) + les 4 primitives (Button variants, Card sub-composants, Input, Label) + leurs cas d'usage. Conformément à §6 AGENTS.md.

### 14. Quality gate (tous verts, dans l'ordre)
```bash
npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
```
Si build casse au-delà de 2 tentatives de fix → `/recover` (anti-pattern §10).

### 15. Skills finaux obligatoires
- `/imprint` (UI créée) → met à jour `ui-registry.md`.
- `/review` (obligatoire avant déclaration F1 terminée).
- `/remember save` (fin de session).

## Critères d'acceptation F1 couverts
1. dev démarre + landing ✓ · 2. dark mode via `.dark` ✓ · 3. `generate` sans erreur ✓ · 4. `migrate` sur Neon ✓ · 5. health auto-import `db` ✓ · 6. `/api/inngest` boot sans crash ✓ · 7. `ui-registry.md` (4 primitives + tokens) ✓ · 8. `.env.example` (§9) ✓

## Hors périmètre F1 (explicite)
Auth Clerk (F2), upload CV (F3), parsing IA (F4), toute fonction Inngest (placeholder = liste vide), tout écran métier, tout composant shadcn non listé.