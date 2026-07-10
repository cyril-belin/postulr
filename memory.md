# Memory — F2 Auth Clerk + middleware gating (POST-REVIEW)

Last updated: 2026-07-10

## What was built

F2 (authentification Clerk + gating onboarding) terminée **ET review passée** —
quality gate complet vert, 9 issues trouvées au review toutes corrigées.

**Dépendances:** `@clerk/nuxt@^2.6.15`, `svix@^1.96.1`, `vue-sonner@^2.0.9`.
shadcn add: Checkbox, Sonner.

**Config & DB:**
- `nuxt.config.ts`: module `@clerk/nuxt` + bloc `clerk` (redirections →
  `/onboarding`). Champs = API Clerk SDK v3 (`signInFallbackRedirectUrl`/
  `signUpFallbackRedirectUrl` — PAS les anciens `afterSignInUrl`).
- Migration `db/0001_brainy_clea.sql`: `users.hasCv boolean notnull default false`
  (appliquée Neon, vérifiée).

**Routes serveur (`server/api/`):**
- `clerk/webhook.post.ts`: signature Svix (raw body `readRawBody`), 401 si
  invalide. user.created/updated → upsert, user.deleted → job cascade. **Review
  fix #6/#7**: user sans email → 200 ack (pas 400, anti retry-storm) ; DB errors
  loggées + 500 pour retry Clerk.
- `me.get.ts`: profil courant (plan, hasCv, consents).
- `onboarding/consents.post.ts`: consentements RGPD Zod-validés, IP.
- `account/delete.post.ts`: émet job cascade. **Review fix #8**: Inngest send
  wrappé (503 si Inngest down, pas 500 générique).
- `health.get.ts`: `{ ok: true }` (TODO F1 résolu).
- `inngest.ts`: register delete-user-cascade.

**Job:** `server/jobs/delete-user-cascade.ts` (squelette SCOPING §5).

**App:**
- `useCurrentUser.ts` SSR-safe. **Review fix #5**: pas de watchEffect (refresh
  piloté explicitement par les middlewares/pages, évite double-fetch).
- `middleware/auth.ts` (→ /sign-in), `middleware/cv-required.ts` (hasCv=false →
  /onboarding). **Review fix #4**: refresh() wrappé try/catch (401 transitoire
  SSR → redirect onboarding, pas crash).
- Pages: sign-in, sign-up, onboarding (consentements), onboarding/upload-cv
  (placeholder F3), dashboard (placeholder + suppression compte).
- Header default.vue: SignedOut → boutons, SignedIn → UserButton. app.vue: Sonner.

**Shared:** `shared/utils/schemas.ts` (Zod consentements, auto-importé).

**Tests:** 13/13 verts (webhook gardes + anti retry-storm, auth 401, cv-required
logique, smoke).

**README:** créé (section Configuration Clerk Dashboard).

## Issues du review (TOUTES corrigées)

Le review a remonté 9 issues (2 critical, 4 important, 3 minor), toutes
corrigées + quality gate re-passé :
- **#6 CRITICAL** — webhook 400 sur user sans email → retry-storm infinie.
  Fix: 200 ack (`ignored: 'no-email'`), l'event user.updated arrivera plus tard.
- **#7 CRITICAL** — erreurs DB webhook silencieuses (500 sans log). Fix: try/catch
  + console.error, 500 pour retry Clerk.
- **#4 IMPORTANT** — cv-required middleware: refresh() pouvait throw (401 SSR
  transitoire) → middleware crash. Fix: try/catch → redirect onboarding.
- **#8 IMPORTANT** — account/delete Inngest send non wrappé → 500 générique.
  Fix: try/catch → 503 clair.
- **#2/#3/#5 MINOR** — commentaire webhook trompeur, typo "touuche", watchEffect
  double-fetch. Fixés.

## Decisions made

- **`<SignedIn>`/`<SignedOut>` et NON `<Show>`**: `<Show>` est une primitive
  Next.js. API Nuxt documentée = `<SignedIn>`/`<SignedOut>` (slot, sans props).
- **API Clerk SDK v3 = renommages**: `afterSignInUrl` → `signInFallbackRedirectUrl`.
  `event.context.auth()` est une FONCTION.
- **Tests server routes = logique pure**: l'environnement Nuxt Vitest ne sert pas
  les routes serveur via `$fetch` (404). Vrai test d'intégration = `setup()` de
  @nuxt/test-utils (boot serveur complet, lourd). Choix: tests de la logique de
  garde. **L'intégration Clerk complète = test E2E Playwright en F10**.
- **Webhook sémantique codes de retour** (acté au review): 401=signature
  invalide (pas de retry), 200=ack (même ignoré, crucial pour anti retry-storm),
  500=erreur transitoire (retry attendu, loggé).
- **Webhook = raw body obligatoire**: `readRawBody(event)`.
- **Ordre AGENTS §8 NON NÉGOCIABLE**: le /remember save est TOUJOURS en dernier,
  après /review. (Inversion corrigée cette session.)

## Problems solved

- **vitest "Missing publishableKey"**: environnement Nuxt boot le plugin client
  Clerk. Fix: charger `.env` dans `vitest.config.ts` via `dotenv.config()`.
- **Composant Sonner généré TS2783** (toastOptions double binding). Fix:
  `computed(mergedToastOptions)`. Déviation mineure §4.1 AGENTS (bug généré).
- **Inngest v4 `createFunction`**: `(options, handler)`, options = `{id,
  triggers:[{event}], retries}`.
- **ModuleOptions Clerk**: champs de redirection via PluginOptions ⊃
  IsomorphicClerkOptions ⊃ ClerkOptions. Vérifier via `.d.ts`, pas mémoire.

## Current state

- **Quality gate FULL VERT post-review:** typecheck ✓, eslint ✓ (0 warning),
  vitest 13/13 ✓, build ✓.
- **Graph régénéré** (`/graphify .`): 248 nœuds, 266 edges, 46 communities.
- **Live vérifié:** `/`, `/sign-in`, `/sign-up` → 200 ; `/api/health` → `{"ok":true}`
  ; `/api/me` + `/api/account/delete` sans auth → 401 ; webhook sans svix → 401
  ; `/dashboard` sans auth → 302 `/sign-in`.
- **Branche `F2-auth-clerk`**: commits faits, **non mergée sur main** (dev
  décide PR vs merge direct).
- **DB Neon:** migration 0001 appliquée (has_cv).
- **`.env`**: clés Clerk test présentes. **À renseigner**:
  `NUXT_CLERK_WEBHOOK_SECRET` (depuis Dashboard Clerk).

## Next session starts with

1. **`/remember restore`**.
2. **MERGE F2**: décider PR vs merge direct vers main. Branche `F2-auth-clerk`
   prête, review passé, quality gate vert.
3. **⚠️ PRÉREQUIS F3 (manuel, bloquant)** — à faire AVANT de démarrer F3 :
   - **(a) Configuration Clerk Dashboard** (README § "Configuration Clerk
     Dashboard"): providers Google/email, endpoint webhook
     `https://postulr.online/api/clerk/webhook`, events `user.created/updated/
     deleted`, récupérer `NUXT_CLERK_WEBHOOK_SECRET` → `.env`.
   - **(b) Test signup réel**: créer un compte via l'UI en local (avec tunnel
     webhook) → valider que la ligne `users` apparaît en base (upsert via
     webhook). **Sans webhook, les users Clerk ne sont pas créés en DB** → F3
     ne peut pas fonctionner.
   - **(c) Décision RGPD Vercel Blob** à trancher en ouverture F3 (SCOPING §3.2
     + §5): Blob privé + URLs signées servies via route authentifiée (cohérent
     rigueur RGPD) vs Blob public (résiduel accepté). Vérifier capacité Blob
     privé via doc officielle Vercel Blob au moment de F3.
4. **Démarrer F3 (Upload CV + storage)** → lire `prompts/F3-*.md`.

## Open questions / TODO pour F3+

- **Tests routes serveur** = logique pure pour l'instant. Envisager `setup()`
  quand le volume de routes augmente, ou à F10 (Playwright).
- Le job `delete-user-cascade` est un squelette : compléter CV Blob (F3) +
  anonymisation applications (F7).
- Composant Sonner modifié (TS2783 fix) — déviation mineure §4.1 documentée.
