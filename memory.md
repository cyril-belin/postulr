# Memory — F1 Setup projet Postulr

Last updated: 2026-07-10

## What was built

F1 (feature d'amorce) terminée — toutes les fondations que F2..F10 étendent.

**Projet initialisé** sur Nuxt 4.4.8 (branche git `F1-setup-projet`, branche `main` = docs de cadrage). Repository précédemment vide (uniquement AGENTS.md/SCOPING.md/prompts/).

**Stack & config racine :**
- `nuxt.config.ts` — modules `shadcn-nuxt` + `@nuxt/eslint` ; Tailwind v4 via plugin `@tailwindcss/vite` ; `typescript.strict: true` ; `runtimeConfig` couvrant intégralement AGENTS.md §9 (12 clés privées + 2 publiques).
- `drizzle.config.ts` — `dialect: 'postgresql'`, `out: './db'`, `schemaCasing: 'snake_case'`.
- `vitest.config.ts` — environnement `nuxt` via `@nuxt/test-utils`.
- `eslint.config.mjs` — flat config `withNuxt()` + override scopé `app/components/ui/**` (`vue/require-default-prop: off`, known-limitation linter vs pattern shadcn).
- `.env.example` documente toutes les vars §9 (+ `NUXT_INNGEST_DEV`).
- `.gitignore` — `.env`, `.nuxt`, `.output`, `node_modules` (migrations `db/` commitées).

**DB (Drizzle + Neon, driver neon-http serverless) :**
- `server/schema/users.ts` — tables `users` (id text PK=Clerk, email unique, plan enum free/pro default free, stripeCustomerId?, billingCurrentPeriodEnd?, createdAt) + `consents` (id uuid defaultRandom, userId FK cascade, type enum cv_processing|data_transfer_eu|marketing, grantedAt, ip?) + index consents(userId). Enums via `pgEnum`.
- `server/schema/index.ts` — barrel.
- `server/utils/db/index.ts` — singleton `getDb()` (lazy init), auto-importé Nitro.
- `db/0000_soft_marvex.sql` — migration initiale, **appliquée sur Neon** (tables + enums vérifiés en live).

**Inngest placeholder :**
- `server/utils/inngest/index.ts` — client singleton `getInngest()` (lazy init), `isDev` via runtimeConfig.
- `server/api/inngest.ts` — `serve({ client, functions: [] })` via `inngest/nuxt`. Liste vide (boote sans crash).

**Route de santé (conservée — voir Décisions) :**
- `server/api/health.get.ts` — `{ ok: true, userCount }`.

**App shell :**
- `app/app.vue`, `app/error.vue` (Card shadcn), `app/layouts/default.vue` (header h-14 border-b + slot), `app/layouts/auth.vue` (centré), `app/pages/index.vue` (landing hero + CTA unique vers `/dashboard`, lien volontairement mort en F1).

**UI (shadcn-vue, style `reka-nova`, base neutral, Reka UI + Lucide) :**
- `app/components/ui/{button,card,input,label}/` — 4 primitives (Button 6 variants/8 sizes, Card +6 sous-composants, Input, Label) installées via CLI.
- `app/assets/css/tailwind.css` — Tailwind v4 CSS-first, tokens `oklch` `:root`/`.dark`/`@theme inline`, `@custom-variant dark`.
- `app/lib/utils.ts` — `cn()`.
- `components.json` — aliases `@/components/ui`, css `app/assets/css/tailwind.css`.
- `ui-registry.md` — registre initial complet (tokens + primitives + tableaux propriété-par-classe + layouts). **Mis à jour via `/imprint`.**

**Tests :** `test/smoke.test.ts` (valid harness Vitest+nuxt). 0 test métier.

## Decisions made

- **Health route conservée** (déviante du prompt F1 qui disait « créer puis supprimer »). Actée avec le dev. Devient le healthcheck prod (Vercel). **Documentée ici comme périmètre volontaire.**
- **`/imprint` et `/review` passés** avant déclaration F1 terminée (obligatoires AGENTS §8).
- **Périmètre = non négociable.** Le prompt définit le scope ; tout ajout hors-périmètre passe par une question AVANT, pas une justification après. Un CTA `/jobs` avait été ajouté « pour le réalisme » dans le hero → retiré sur ce principe. Message installé pour F2+.
- **Anti-patterns = non négociables, zéro exception.** `process.env` direct en code serveur est interdit (AGENTS §10), même avec une « bonne excuse ». Appliqué strictement dès F1.
- **Singletons serveur (`db`, `inngest`) en lazy init** via getter (`getDb()`/`getInngest()`), pas export module-level — car `useRuntimeConfig()` au moment de l'import du module (boot Nitro) renvoie des valeurs non-hydratées.
- **shadcn-vue installe Tailwind v4 CSS-first** (pas de `tailwind.config.ts`). Format = ce que la CLI écrit, non modifié.

## Problems solved

- **`nuxi init` ne copie rien dans un dossier non-vide** → init dans `/tmp/postulr-init` puis fusion manuelle (en préservant AGENTS.md/SCOPING.md/prompts/).
- **Imports Drizzle Postgres** : `pgTable`/`pgEnum`/`text`/`uuid`/`timestamp`/`index` viennent de `drizzle-orm/pg-core` (PAS de la racine `drizzle-orm`). Erreur initiale `pgEnum is not a function` → corrigée.
- **`drizzle-kit` charge `.env` lui-même** ; le shell `source .env` casse sur les URLs avec `&` (`sslmode=require&...`). Pour vérifs DB en CLI, parser `.env` en node.
- **`@nuxt/test-utils` environnement `nuxt` nécessite `happy-dom`** (pas jsdom) — sinon `Could not resolve "happy-dom"`.
- **Inngest dev mode — gotcha clé (NE PAS RE-SOUDRE) :**
  - L'erreur `"In cloud mode but no signing key found"` venait de `config.inngestDev === '1'` qui était `false`.
  - Cause : **Nuxt/`untyped` coercent `NUXT_INNGEST_DEV=1` en number au runtime** bien que le type généré soit `string`. `1 === '1'` → false → `isDev` forcé à `false` (boolean) → mode cloud exigé.
  - Fix : `isDev: String(config.inngestDev) === '1'` (normalisation string). **+ lazy init du client** (`getInngest()`) car le module-level boot lit runtimeConfig trop tôt.
  - Le serve handler `serve()` ne prend PAS d'option `isDev`/`dev` — le mode vient uniquement du client `new Inngest({ isDev })`.
- **`vue/require-default-prop` warnings sur composants shadcn générés** → override ESLint scopé plutôt que d'éditer les fichiers générés (AGENTS §4.1 : ne pas modifier la CLI output).

## Current state

- **Quality gate FULL VERT après les 3 fixes du review :** `nuxt typecheck` ✓ (0 erreur), `eslint .` ✓ (0 erreur, **0 warning**), `vitest run` ✓ (1/1), `nuxt build` ✓.
- **Live vérifié :** `GET /` → 200 (landing, CTA unique), `GET /api/health` → `{"ok":true,"userCount":0}`, `GET /api/inngest` → 200 (dev mode OK, headers SDK présents).
- **DB Neon :** migration appliquée (tables `users`/`consents`, enums `plan`/`consent_type`, 1 migration tracée).
- **`.env`** contient `NUXT_DATABASE_URL`, `NUXT_INNGEST_DEV=1`, `NUXT_PUBLIC_APP_URL`, et des clés Clerk de test (publishable + secret, mode test) déjà posées par le dev pour F2.
- **Pas encore committé sur la branche F1** (les fichiers sont unstaged).

## Next session starts with

1. **`/remember restore`** (recharger ce mémoire).
2. **Committer F1** sur la branche `F1-setup-projet` puis merger vers `main` (ou PR) — au choix du dev.
3. **Démarrer F2 (Auth Clerk)** → lire `prompts/F2-auth-clerk.md`. Premier sous-objectif : installer `@clerk/nuxt`, brancher le plugin client `clerk.client.ts`, créer le middleware `auth.ts` + `cv-required.ts`, écrans sign-in/sign-up (layout `auth.vue`), et **protéger le dashboard** (le CTA `/dashboard` devient fonctionnel).

## Open questions / TODO pour F2

- **F2 — PROTÉGER `/api/health`** : la route est actuellement publique et expose `userCount`. Une fois Clerk en place, soit la mettre derrière auth, soit la limiter à un healthcheck sans donnée (ex. `{ ok: true }` sans le count). **TODO explicite, marqué dans `server/api/health.get.ts`.**
- Vérifier au démarrage de F2 : la commande exacte d'install de `@clerk/nuxt` + l'API `event.context.auth()` (FONCTION, pas propriété — AGENTS §5.1) via doc Clerk Nuxt, pas mémoire.
- Le squelette du job `delete-user-cascade` (RGPD) est prévu en F2 per SCOPING §5 — à créer vide puis compléter au fil des features.
