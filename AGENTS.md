# AGENTS.md — Postulr

> Instructions de référence pour tout agent (ou humain) intervenant sur le code
> de Postulr. **À lire en premier dans toute session d'implémentation.**
>
> Ce document s'appuie sur `SCOPING.md` (décisions produit figées) et a été
> construit avec le MCP Nuxt + le skill `nuxt-technical`. Les APIs Nuxt décrites
> ici ont été vérifiées le 2026-07-10 via la doc officielle Nuxt 4.x.

---

## 1. Stack & versions

| Domaine | Technologie | Vérifier au changement |
|---|---|---|
| Framework | **Nuxt 4.x** (dernière stable) | MCP Nuxt |
| Langage | **TypeScript strict** (`strict: true`) | `tsconfig.json` |
| DB | **NeonDB** (Postgres serverless, branching par feature) | docs NeonDB |
| ORM | **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) | docs Drizzle |
| Auth + Billing | **Clerk** (`@clerk/nuxt`) — Google/email + Clerk Billing | docs Clerk Nuxt |
| UI | **shadcn-nuxt** (`shadcn-nuxt` module) + **Tailwind CSS** | docs shadcn-vue |
| Background jobs | **Inngest** via server route Nitro `/api/inngest` | docs Inngest |
| Storage PDF | **Vercel Blob** (`@vercel/blob`) | docs Vercel Blob |
| LLM | **OpenAI** (modèle `gpt-5.4-nano`) derrière abstraction | docs OpenAI |
| Tests | **Vitest** (+ `@vue/test-utils`, `@nuxt/test-utils`) | — |
| Déploiement | **Vercel** | — |

> ⚠️ **Règle absolue** : ne JAMAIS se fier à sa mémoire pour une API Nuxt,
> Clerk, Drizzle, OpenAI ou Vercel Blob. Toujours vérifier via MCP Nuxt ou la
> doc officielle avant d'écrire du code qui appelle ces APIs.

---

## 2. Structure des dossiers

Nuxt 4 isole le code app dans `app/`. Postulr suit cette convention à la lettre.

```
postulr/
├─ app/                          # Code applicatif (auto-importé)
│  ├─ app.vue                    # Root component (NuxtLayout + NuxtPage)
│  ├─ error.vue                  # Page d'erreur globale
│  ├─ assets/                    # CSS (tailwind), fonts, images processées
│  ├─ components/                # Composants Vue (auto-importés)
│  │  ├─ ui/                     # Composants shadcn-nuxt (REGISTRE — ne pas inventer)
│  │  └─ <feature>/              # Composants métier groupés par feature
│  ├─ composables/               # useXxx() réutilisables (un dossier par feature si >1)
│  ├─ layouts/                   # default.vue, auth.vue, dashboard.vue
│  ├─ middleware/                # Route middleware (auth.ts, cv-required.ts, plan-gate.ts)
│  ├─ pages/                     # Routes basées sur les fichiers
│  ├─ plugins/                   # Plugins Vue (clerk.client.ts, etc.)
│  └─ utils/                     # Utils auto-importés côté app uniquement
├─ server/                       # Code serveur Nitro
│  ├─ api/                       # Routes REST /api/...
│  │  ├─ [feature]/              # Groupé par feature (auth, cv, jobs, applications, billing)
│  │  └─ inngest.ts              # Endpoint Inngest (/api/inngest)
│  ├─ jobs/                      # Fonctions Inngest (parse-cv, aggregate-jobs, generate-pack, ...)
│  ├─ middleware/                # Server middleware (auth context, logging)
│  ├─ plugins/                   # Nitro plugins (drizzle client, inngest client)
│  ├─ utils/                     # Utils serveur (db, llm, storage, ats, auth)
│  │  ├─ db/                     # Client Drizzle + schéma ré-exporté
│  │  ├─ llm/                    # Abstraction LlmProvider + impl OpenAI
│  │  ├─ storage/                # Abstraction StorageProvider + impl Vercel Blob
│  │  ├─ ats/                    # Abstraction AtsApplier + impls Greenhouse/Lever
│  │  └─ auth.ts                 # Helpers Clerk côté serveur
│  └─ schema/                    # Schéma Drizzle (1 fichier par entité majeure)
├─ shared/                       # Code partagé app ↔ server (PAS de Vue/Nitro imports)
│  ├─ types/                     # Types TS auto-importés des 2 côtés
│  └─ utils/                     # Validators Zod, constantes, enums (auto-importés)
├─ db/                           # Migrations Drizzle (générées par drizzle-kit)
├─ test/                         # Config Vitest + helpers + tests integration
├─ public/                       # Assets statiques (favicon, robots.txt)
├─ prompts/                      # Prompts par feature (F1..F10.md)
├─ ui-registry.md                # Registre visuel des composants (cf §6)
├─ SCOPING.md                    # Décisions produit figées
├─ AGENTS.md                     # Ce fichier
├─ nuxt.config.ts
├─ drizzle.config.ts
├─ tailwind.config.ts
├─ vitest.config.ts
├─ package.json
└─ .env                          # Variables d'environnement (non commité)
```

### Règles de placement

- **Une entité Drizzle = un fichier** dans `server/schema/` (ex. `users.ts`,
  `jobs.ts`, `applications.ts`), ré-exporté par `server/schema/index.ts`.
- **Une feature = un sous-dossier** dans `app/components/`, `server/api/`,
  `server/jobs/` quand elle a >1 fichier.
- **Schémas Zod de validation** : dans `shared/utils/` s'ils sont partagés
  app↔server (ex. formes de formulaire), sinon dans `server/utils/` s'ils ne
  servent qu'aux routes.
- **Types partagés** : `shared/types/`. Auto-importés des deux côtés.
- Le code dans `shared/` **ne peut pas importer** de Vue ou Nitro.

---

## 3. Conventions de nommage

| Type | Convention | Exemple |
|---|---|---|
| Fichiers composants | PascalCase | `JobCard.vue` |
| Composants shadcn | PascalCase, préfixe du registre | `Button.vue`, `Dialog.vue` |
| Composables | camelCase, `use` prefix | `useJobBoard()` |
| Pages | kebab-case, brackets pour dyn. | `pages/jobs/[id].vue` |
| Server routes | kebab-case + `.method.ts` | `server/api/cv/upload.post.ts` |
| Schémas Drizzle | kebab-case | `server/schema/users.ts` |
| Tables SQL | snake_case | `saved_jobs`, `applications` |
| Colonnes SQL | snake_case | `created_at`, `user_id` |
| Fonctions Inngest | kebab-case | `parse-cv`, `aggregate-jobs-ats` |
| Branches git | `F<n>-<slug>` | `F3-upload-cv` |

---

## 4. Règles UI strictes (non négociable)

### 4.1 shadcn-nuxt uniquement

- **Seuls les composants du registre shadcn-nuxt sont autorisés.** Aucun autre
  système UI (pas de Vuetify, Quasar, Naive UI, Element Plus, etc.).
- Ajouter un composant : via la CLI shadcn-vue (`npx shadcn-vue add <component>`),
  jamais écrit à la main. Chaque ajout est tracé dans `ui-registry.md` (cf §6).
- **Interdiction d'inventer des composants hors registre.** Si un besoin UI
  n'est pas couvert, il se compose à partir de briques shadcn (Card, Dialog,
  Sheet, etc.), ou on ouvre une discussion avant d'ajouter au registre.
- Les composants métier vont dans `app/components/<feature>/` et utilisent les
  primitives shadcn en interne.

### 4.2 Tokens Tailwind

Le design system vit dans `tailwind.config.ts` + un fichier de tokens CSS.
**Aucune valeur ad hoc** (pas de `text-[#3b82f6]`, pas de `p-[13px]`). Utiliser
uniquement :

- **Couleurs** : tokens sémantiques définis (`background`, `foreground`,
  `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`,
  `ring`). Variables CSS HSL consommées par Tailwind (convention shadcn).
- **Typographie** : échelle Tailwind (`text-sm`, `text-base`, `text-lg`...).
  Familles définies dans `tailwind.config.ts`.
- **Espacement / arrondis / ombres** : échelle Tailwind standard
  (`rounded-md`, `shadow-sm`...). Pas de rayon custom.
- **Dark mode** : géré par la classe `.dark` (convention shadcn). Les tokens
  sémantiques ont une variante dark automatique.

### 4.3 Accessibilité

- shadcn-vue (Radix Vue) gère l'a11y par défaut — **ne pas casser** les
  attributs ARIA en surchargeant les primitives.
- Tout interactif doit être au clavier (focus visible avec le token `ring`).
- Images avec `alt`, boutons avec texte ou `aria-label`.

---

## 5. Patterns techniques de référence

### 5.1 Server routes (REST + Zod)

Entrées validées par Zod via les helpers h3 `readValidatedBody`,
`getValidatedQuery`, `getValidatedRouterParams`. Sorties typées Drizzle. Erreurs
via `createError` avec codes HTTP sémantiques. **Pas de logique métier dans les
routes** — elles délèguent à `server/utils/` et `server/jobs/`.

```ts
// server/api/applications/create.post.ts — route REST protégée standard
import { z } from 'zod'
import { createApplicationSchema } from '#shared/utils/schemas'   // schéma partagé app↔server

export default defineEventHandler(async (event) => {
  // ⚠️ Clerk (vérifié doc Clerk Nuxt) : event.context.auth est une FONCTION,
  //    pas une propriété. Renvoie l'objet Auth (userId, orgId, sessionId...).
  const auth = await event.context.auth()
  const userId = auth?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readValidatedBody(event, createApplicationSchema.parse)
  const application = await createApplication(userId, body)   // auto-importé depuis server/utils
  setResponseStatus(event, 201)
  return application
})
```

> **Note sur les imports serveur** : Nitro auto-importe `server/utils/*` et
> `server/jobs/*` — pas besoin d'import explicite pour ces deux dossiers
> (préférer l'auto-import). L'alias **`#server`** existe bien en Nuxt 4.x
> (doc officielle, section « Server Alias ») et sert pour les imports explicites
> hors auto-import — notamment `server/schema/*` (non auto-importé) :
> `import { users } from '#server/schema/users'`. Ne jamais importer du `server/`
> dans du code client.

- Méthode HTTP portée par le nom de fichier (`.get.ts`, `.post.ts`, ...).
- Paramètre dynamique : `server/api/jobs/[id].get.ts` + `getRouterParam`.
- Config serveur : `useRuntimeConfig(event)` (jamais `process.env` directement
  dans une route — passer par `runtimeConfig`).

### 5.2 Upload CV — flux client + serveur (décision de cadrage)

Le CV transite par **Vercel Blob en upload direct navigateur → Blob** (pas de
multipart via la server route). La server route orchestre (token + callback),
ne reçoit jamais le binaire. Flux vérifié via doc Vercel Blob `client-upload` :

1. **Client** : `upload(file, { access: 'public', handleUploadUrl: '/api/cv/upload' })`
   depuis `@vercel/blob/client`. Le navigateur POST le fichier directement vers
   Blob après avoir obtenu un token.
2. **Server route `/api/cv/upload`** : utilise `handleUpload()` de `@vercel/blob`
   avec deux handlers :
   - `onBeforeGenerateToken(req)` : vérifie `event.context.auth()` (Clerk),
     contrôle le quota free tier (1 re-parse/mois via `checkQuota()`),
     **allowlist stricte du content-type** (`application/pdf` uniquement) et
     limite la taille (ex. 5 Mo). Retourne le token client-upload.
   - `onUploadCompleted(payload)` : webhook Blob → persiste `documents.blobUrl`
     + version en base, déclenche le job Inngest `parse-cv`.
3. **Sécurité** : le token est court-vie ; le `contentType` est vérifié dans
   `onBeforeGenerateToken` (le client ne peut pas le forcer) ; le webhook
   `onUploadCompleted` est signé par Vercel Blob (anti-forgery).
4. **Variables** : `NUXT_BLOB_READ_WRITE_TOKEN` côté server, token client généré
   ponctuellement (jamais exposé le read-write token au navigateur).

> Rationale : le multipart via Nitro se heurte à la limite body des fonctions
> serverless Vercel (~4,5 Mo) et double la bande passante ; l'upload direct
> client évite les deux. Le job Inngest récupère le PDF via l'URL Blob signée.

### 5.3 Composables

- `useXxx()` uniquement pour logique réutilisable cross-composants. Un composable
  par feature si >1.
- État SSR-safe : `useState('unique-key', () => init)` — **jamais** de `ref()`
  au module-level (partage cross-requêtes côté serveur = fuite + pollution).
- Fetch de données top-level : `useFetch` / `useAsyncData` (évite le double-fetch
  SSR+hydration). `$fetch` brut uniquement dans des handlers d'événements ou
  actions utilisateur.

```ts
// app/composables/useApplications.ts
export const useApplications = () => {
  const { data, refresh, pending } = useFetch('/api/applications', { key: 'applications' })
  return { applications: data, refresh, pending }
}
```

### 5.4 Drizzle

- Client singleton dans `server/utils/db/index.ts`, **auto-importé** par Nitro
  (consommable directement comme `db` dans toute route). Le schéma, lui, n'est
  pas auto-importé : `import { users } from '#server/schema/users'`.
- Schéma dans `server/schema/`, typage strict, `drizzle-kit` pour les migrations
  dans `db/`.
- Relations déclarées explicitement (relational queries) pour les jointures
  propres (profil + experiences + skills en une query).
- Une migration = un `drizzle-kit generate` daté. **Ne jamais éditer une
  migration appliquée** — en créer une nouvelle.

### 5.5 Abstractions de providers

Trois interfaces isolées dans `server/utils/`, pour pouvoir changer de provider
sans toucher au métier :

```ts
// server/utils/llm/types.ts
export interface LlmProvider {
  generateStructured<T>(prompt: string, schema: z.ZodType<T>, opts?: LlmOpts): Promise<T>
}
// impl: server/utils/llm/openai.ts  (modèle gpt-5.4-nano)
// factory: server/utils/llm/index.ts → choisit l'impl selon runtimeConfig

// server/utils/storage/types.ts
export interface StorageProvider {
  put(key: string, bytes: Buffer, contentType: string): Promise<{ url: string }>
  get(url: string): Promise<Buffer>
  delete(url: string): Promise<void>
}
// impl: server/utils/storage/vercel-blob.ts

// server/utils/ats/types.ts
export interface AtsApplier {
  submit(applicationId: string): Promise<{ atsSubmissionId: string }>
  verify(atsSubmissionId: string): Promise<{ status: 'confirmed' | 'failed' }>
}
// impls: server/utils/ats/greenhouse.ts, server/utils/ats/lever.ts
```

- Aucun code métier n'importe `openai` ou `@vercel/blob` directement.
- **Sorties LLM toujours validées par Zod** à la réception. Échec de validation =
  erreur gérée (retry borné Inngest ou fallback métier), jamais propagation
  silencieuse.

### 5.6 Inngest

- Endpoint unique `/api/inngest` (server route) qui register toutes les fonctions.
- Fonctions dans `server/jobs/` : `parse-cv`, `aggregate-jobs-ft`,
  `aggregate-jobs-adzuna`, `aggregate-jobs-ats`, `generate-pack`,
  `verify-ats-submission`, `delete-user-cascade`.
- Crons déclarés dans la fonction Inngest (différenciés par source — cf SCOPING §3.7).
- Retry borné (max 3, backoff exponentiel), jamais infini.
- Le parsing CV et la génération de pack passent **toujours** par Inngest
  (coût + latence), jamais par une route synchrone.

### 5.7 Gestion d'erreurs

- Côté serveur : `createError({ statusCode, statusMessage })`. Codes sémantiques
  (400 validation, 401 unauth, 403 forbidden/plan, 404 not found, 409 conflict,
  429 rate limit, 500 serveur). **Pas de `throw new Error()` brut.**
- Côté app : `NuxtErrorBoundary` autour des zones à risque, `showError()` pour
  les erreurs fatales, toast shadcn pour les erreurs user-facing non fatales.
- Erreurs Inngest : loggées + retry borné + état persisté en base (ex. statut
  `applications.status` mis à jour en cas d'échec de génération).

### 5.8 RGPD & données utilisateur

- Tout accès données user passe par `event.context.auth()` (fonction Clerk,
  pas propriété — cf §5.1) qui expose `userId`, `orgId`, `sessionId`.
- Suppression compte : job Inngest `delete-user-cascade` en cascade (user →
  CV Blob → anonymisation applications → purge Inngest). Hard-delete user,
  anonymisation des `applications` pour analytics. Pas de soft-delete user.
- Consentements tracés dans `consents` (`cv_processing`, `data_transfer_eu`,
  `marketing`).

---

## 6. Registre UI (`ui-registry.md`)

À la racine, `ui-registry.md` est le **registre vivant des composants UI** :
primitives shadcn installées + composants métier créés, avec leurs variants,
leurs tokens, leurs cas d'usage.

- **Mis à jour obligatoirement** après chaque création/modification de composant
  UI via le skill `/imprint`.
- C'est la seule source de vérité pour "qu'est-ce qui existe déjà comme
  composant". Avant de créer un composant, consulter le registre.

---

## 7. Schéma Drizzle de référence

Résumé des entités (définitions complètes dans `server/schema/`). Les `?` =
nullable, `[]` = relation.

### Utilisateur & profil
```
users              id (Clerk) PK, email, plan 'free'|'pro',
                   stripeCustomerId?, billingCurrentPeriodEnd?, createdAt
consents           userId FK, type 'cv_processing'|'data_transfer_eu'|'marketing',
                   grantedAt, ip
profiles           userId FK PK (1:1), headline?, targetTitle?, location?,
                   latitude?, longitude?, languages?, salaryMin?, salaryMax?,
                   availability?, about?
experiences        id PK, userId FK, title, company, startDate, endDate?,
                   description?, employmentType
educations         id PK, userId FK, degree, school, startDate, endDate?, mention?
skills             id PK, userId FK, label, level?, source 'PARSED'|'MANUAL'
languages          id PK, userId FK, language, levelCECRL?
certifications     id PK, userId FK, label, issuer, date?
documents          id PK, userId FK, kind 'CV', blobUrl, parsedAt?, version int
```

### Offres & candidature
```
jobs               id PK, source, sourceId, title, company, location,
                   contractType, salaryMin?, salaryMax?, description text,
                   atsType 'greenhouse'|'lever'?, atsFormUrl?,
                   autoApplyEligible bool, rawJson jsonb, dedupHash,
                   firstSeenAt, createdAt
job_sources        jobId FK, source                  -- sources multiples d'un job dédup
saved_jobs         userId FK, jobId FK, savedAt      -- PK composite (userId, jobId)
applications       id PK, userId FK, jobId FK, status, deepLink?,
                   missingData jsonb, coverLetter text?, generatedAnswers jsonb?,
                   submittedAt?, atsSubmissionId?, createdAt, updatedAt
```

### Énumérations (Zod enums partagés dans `shared/utils/`)
- `plan` : `free | pro`
- `applications.status` : `DRAFT | GENERATED | MISSING_DATA | READY |
  SUBMITTED_MANUAL | SUBMITTED_AUTO | INTERVIEW | OFFER | REJECTED |
  WITHDRAWN | ARCHIVED`
- `skills.source` : `PARSED | MANUAL`
- `documents.kind` : `CV`
- `consents.type` : `cv_processing | data_transfer_eu | marketing`
- `jobs.atsType` : `greenhouse | lever | null`

---

## 8. Quality gate obligatoire (fin de chaque feature)

**Avant de déclarer une feature terminée, exécuter dans l'ordre, tous verts :**

```bash
npx nuxt typecheck     # 1. Types TS (vue-tsc)
npx eslint .           # 2. Lint
npx vitest run         # 3. Tests unit + integration
npx nuxt build         # 4. Build prod
```

Puis :
- **`/review` obligatoire** (en complément du quality gate) — vérifie confor­mité
  au SCOPING + aux standards présents. Ne pas déclarer la feature terminée tant
  que `/review` n'est pas passé.
- **`/imprint` obligatoire** si un composant UI a été créé ou modifié → met à
  jour `ui-registry.md`.
- **`/remember save`** en fin de session.

Si un build casse après 2 tentatives de fix : **`/recover` obligatoire** —
interdiction de patcher en boucle au-delà.

---

## 9. Environnements & variables

### Environnements
- **Dev local** : NeonDB branch dédié + Vercel Blob dev + Inngest dev server
  (`npx inngest-cli dev`).
- **Preview** : branche `main` PR → Vercel preview auto + NeonDB branch auto.
- **Prod** : NeonDB main branch + Inngest prod + Vercel prod + Clerk prod.

### Variables d'environnement (via `runtimeConfig`, jamais `process.env` direct)
```
NUXT_DATABASE_URL              NeonDB connection string
NUXT_CLERK_SECRET_KEY          Clerk backend
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NUXT_CLERK_WEBHOOK_SECRET
NUXT_BLOB_READ_WRITE_TOKEN     Vercel Blob
NUXT_OPENAI_API_KEY            LLM
NUXT_INNGEST_EVENT_KEY         Inngest
NUXT_INNGEST_SIGNING_KEY
NUXT_PUBLIC_APP_URL            https://postulr.online (prod)
NUXT_FRANCE_TRAVAIL_CLIENT_ID  France Travail API (F5)
NUXT_FRANCE_TRAVAIL_CLIENT_SECRET
NUXT_ADZUNA_APP_ID             Adzuna API (F5)
NUXT_ADZUNA_API_KEY
```

Côté app : préfixer `NUXT_PUBLIC_`. Côté server : consommer via
`useRuntimeConfig(event)`.

---

## 10. Skills et discipline de session

Ces skills sont **imposés** dans toute session d'implémentation Postulr :

| Moment | Skill | Obligation |
|---|---|---|
| Début de session | `/remember restore` | Recharger le contexte de la feature en cours |
| Décision technique | `nuxt-technical` (skill) | Référence pour toute décision d'implémentation Nuxt/Vue |
| Vérif API Nuxt | MCP Nuxt (`get-documentation-page`, `get-module`) | Ne jamais se fier à sa mémoire pour les APIs |
| Fin de session | `/remember save` | Persister l'état pour la session suivante |
| Après chaque feature | `/review` | Obligatoire AVANT de déclarer terminée (+ quality gate) |
| Après composant UI | `/imprint` | Met à jour `ui-registry.md` |
| Problème persistant | `/recover` | Dès que 2 fixes ont échoué — pas de boucle de patch |

### Anti-patterns interdits
- ❌ Inventer un composant UI hors registre shadcn.
- ❌ Valeur Tailwind ad hoc hors tokens.
- ❌ `throw new Error()` au lieu de `createError()`.
- ❌ `process.env` direct dans une route → `useRuntimeConfig(event)`.
- ❌ `ref()` module-level dans un composable → `useState`.
- ❌ `$fetch` brut dans `<script setup>` top-level → `useFetch`.
- ❌ Importer `openai`/`@vercel/blob` hors de `server/utils/llm|storage`.
- ❌ Sortie LLM non validée par Zod.
- ❌ Fusionner deux features pour aller plus vite.
- ❌ Patcher en boucle au-delà de 2 tentatives → `/recover`.
- ❌ Se fier à sa mémoire pour une API Nuxt/Clerk/Drizzle/OpenAI.

---

## 11. Ordre des features

Voir `prompts/F1..F10.md` pour le périmètre détaillé de chaque feature.
L'ordre est impératif (chaque feature dépend de la précédente) :

1. **F1** — Setup projet + config + design tokens + ui-registry initial
2. **F2** — Auth Clerk + middleware "CV requis avant dashboard"
3. **F3** — Upload CV + storage
4. **F4** — Parsing CV par IA + écrans profil
5. **F5** — Agrégation offres (Inngest cron + table jobs normalisée + dédup)
6. **F6** — Job board UI + sauvegarde d'offres
7. **F7** — Pack de candidature (analyse formulaire + génération réponses/lettre)
8. **F8** — Flow "missing data" + AI autofill
9. **F9** — Auto-apply ATS + statuts + vérification de soumission
10. **F10** — Clerk Billing + paywall + limites free tier (+ E2E Playwright)
