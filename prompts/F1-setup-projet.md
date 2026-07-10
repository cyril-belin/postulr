# F1 — Setup projet + config + design tokens + ui-registry initial

> Feature d'amorce. Pose les fondations que toutes les autres features étendent.
> **À lancer en premier**, dans un repo vide.

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md` en premier** (à la racine) — conventions, anti-patterns,
   quality gate. C'est la source de vérité.
2. **Lire `SCOPING.md`** pour les décisions produit figées (stack, limites,
   schéma de données cible).
3. Lancer **`/remember restore`** pour recharger le contexte éventuel.
4. Pour toute API Nuxt/Clerk/Drizzle/Vercel Blob/OpenAI : **vérifier via MCP Nuxt
   ou doc officielle**, jamais se fier à sa mémoire.

## 1. Périmètre

### Inclus
- Initialisation Nuxt 4 + TypeScript strict (`strict: true`).
- Dépendances de base installées et configurées (pas les intégrations métier —
  cf F2..F10) :
  - `tailwindcss` + `shadcn-nuxt` (CLI initialisée, `components.json`)
  - `drizzle-orm` + `drizzle-kit` + driver NeonDB (`@neondatabase/serverless`)
  - `zod`
  - `vitest` + `@vue/test-utils` + `@nuxt/test-utils` (config prête, 0 test)
  - `eslint` + config Nuxt flat config
- Fichiers de config racine : `nuxt.config.ts`, `tailwind.config.ts`,
  `drizzle.config.ts`, `vitest.config.ts`, `tsconfig.json` (géré par Nuxt),
  `.env.example`, `.gitignore`.
- **Design tokens** : variables CSS HSL sémantiques (`--background`,
  `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`,
  `--destructive`, `--border`, `--input`, `--ring`) en light + dark, consommées
  par `tailwind.config.ts`. Pas de valeur ad hoc.
- **Composants shadcn de base** installés via CLI : `Button`, `Card` (avec
  Header/Content/Footer), `Input`, `Label`. C'est tout pour F1.
- **`ui-registry.md` initialisé** à la racine : documente les tokens + les 4
  primitives shadcn installées + leurs variants.
- **Layouts** : `app/layouts/default.vue` (header minimal + slot) et
  `app/layouts/auth.vue` (centré, pour les futurs écrans Clerk).
- **Page d'accueil** `app/pages/index.vue` : landing minimaliste (titre, CTA
  vers /dashboard qui n'existe pas encore — volontaire, le lien sera fonctionnel
  en F2).
- **Schéma Drizzle minimal** : uniquement `users` et `consents` (les autres
  entités viennent feature par feature). Migration initiale.
- **Client Drizzle** dans `server/utils/db/` (auto-importé Nitro).
- **Runtime config** : toutes les variables listées dans AGENTS.md §9, vides en
  dev local, peuplées via `.env.example`.
- **Plugin Inngest** placeholder : `server/api/inngest.ts` sert un endpoint
  vide (sera rempli en F3/F5). Client Inngest créé dans `server/utils/inngest/`.

### Exclus
- Auth Clerk (F2), upload CV (F3), parsing IA (F4), job board (F5/F6),
  applications (F7+), billing (F10).
- Tout composant shadcn non listé ci-dessus.
- Tout écran métier (dashboard, profil, etc.).

## 2. Entités & migrations

### `server/schema/users.ts`
```
users        id text PK (= Clerk userId), email text notnull,
             plan 'free'|'pro' default 'free', stripeCustomerId text?,
             billingCurrentPeriodEnd timestamp?, createdAt timestamp default now
consents     id uuid PK default gen_random_uuid(), userId text FK→users,
             type 'cv_processing'|'data_transfer_eu'|'marketing',
             grantedAt timestamp default now(), ip text?
```
- Index sur `consents(userId)`.
- Migration initiale générée par `drizzle-kit generate` dans `db/`.
- Ré-export par `server/schema/index.ts`.

## 3. Écrans & composants à produire

- `app/app.vue` — `<NuxtLayout><NuxtPage/></NuxtLayout>` + gestion error minimale.
- `app/error.vue` — page d'erreur globale (utilise Card shadcn).
- `app/layouts/default.vue` — header (logo + nav placeholder), `<slot/>`.
- `app/layouts/auth.vue` — centré, `<slot/>`.
- `app/pages/index.vue` — landing minimaliste (hero + CTA).
- `app/components/ui/*` — primitives shadcn installées (Button, Card, Input,
  Label + sous-composants Card).
- `ui-registry.md` — registre initial.

## 4. Critères d'acceptation vérifiables

1. `npm run dev` démarre sans erreur, `http://localhost:3000` affiche la landing.
2. Le dark mode toggle (via classe `.dark` sur `<html>`) change correctement les
   tokens — vérifier visuellement.
3. `npx drizzle-kit generate` produit la migration initiale sans erreur.
4. La migration s'applique sur un NeonDB branch de dev (`drizzle-kit push`).
5. Le client `db` est auto-importé et utilisable dans une route de test
   `server/api/health.get.ts` (renvoie `{ ok: true, userCount }` — supprimée
   après vérification, c'est un test de fumée).
6. L'endpoint `/api/inngest` répond (404 ou 200 selon payload, mais pas de crash
  au boot).
7. `ui-registry.md` liste les 4 primitives + les tokens.
8. `.env.example` documente toutes les variables de AGENTS.md §9.

## 5. Sortie obligatoire

- Quality gate complet, tous verts :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire avant de déclarer F1 terminée.
- **`/imprint`** obligatoire (UI créée : landing + layouts + primitives).
- **`/remember save`** en fin de session.
- Branch git : `F1-setup-projet`.
