# Memory — F2 Auth Clerk + corrections post-review externe

Last updated: 2026-07-10

## What was built

F2 (auth Clerk + gating onboarding) terminée, **review interne passé (9 issues
corrigées) + corrections d'une review externe (3 points) appliquées**. Branche
`F2-auth-clerk` prête pour PR.

Voir les commits détaillés pour le détail de F2 (auth, webhook, middlewares,
pages, onboarding RGPD, job delete-user-cascade squelette). Récap rapide :
module `@clerk/nuxt` (auto-configuré, **PAS de plugin client manuel** —
décision actée doc Clerk), webhook Svix signé, consentements RGPD, middlewares
auth/cv-required, `users.hasCv` (migration 0001).

## Corrections review externe (3, cette session)

1. **Self-host Geist (RGPD + bug)** — `app/assets/css/tailwind.css` importait
   Geist via `@import url('https://fonts.googleapis.com/...')` (transmet l'IP
   visiteur à Google sans consentement — incompatible SCOPING §3.6) ET avec un
   family mismatch (`@import` chargeait `Geist`, token déclarait `Geist Variable`
   → fallback silencieux). Fix: package `@fontsource-variable/geist` self-hosté,
   `@import "@fontsource-variable/geist"` dans le CSS, suppression de l'import
   Google. Family alignée (`'Geist Variable'` — confirmé via le CSS du package).
   **Vérif visuelle Playwright**: `getComputedStyle(h1).fontFamily` =
   `"Geist Variable", sans-serif`, `document.fonts.check()` = true, police bien
   rendue (pas le fallback).
2. **`jsdom` supprimé** des devDependencies (relicat d'essai ; `happy-dom` est
   l'env requis par @nuxt/test-utils). Aucune référence source.
3. **Ligne obsolète `clerk.client.ts` purgée** — la memory F1 mentionnait
   « brancher le plugin client clerk.client.ts ». Déjà absente de la memory
   post-review F2 ; la décision (auto-configuration par le module, **pas de
   plugin manuel**) est documentée ici explicitement pour éviter toute rechute.

`.gitignore`: `.playwright-mcp/` ajouté (artefact de test Playwright).

## Decisions made

- **Clerk = auto-configuration, PAS de plugin client manuel** (`app/plugins/
  clerk.client.ts` à NE PAS créer). Le module `@clerk/nuxt` s'auto-configure
  (middleware + plugins + composants auto-importés). Décision doc Clerk Nuxt
  vérifiée 2026-07-10.
- **`<SignedIn>`/`<SignedOut>` et NON `<Show>`** (primitive Next.js).
- **Geist self-hosté** via `@fontsource-variable/geist` — jamais de Google Fonts
  CDN (RGPD). Family = `'Geist Variable'`.
- **API Clerk SDK v3 renommages**: `afterSignInUrl` → `signInFallbackRedirectUrl`.
  `event.context.auth()` est une FONCTION.
- **Tests server routes = logique pure** (env Nuxt Vitest ne sert pas les routes
  via `$fetch`). Intégration Clerk complète = Playwright en F10.
- **Webhook sémantique codes**: 401=signature invalide (pas retry), 200=ack (même
  ignoré, anti retry-storm), 500=erreur transitoire (retry, loggé).
- **Ordre AGENTS §8 NON NÉGOCIABLE**: /review AVANT /remember save (qui est
  TOUJOURS en dernier).

## Problems solved

- **Geist RGPD + mismatch**: self-host via fontsource, family alignée.
- **vitest "Missing publishableKey"**: charger `.env` dans `vitest.config.ts`
  via `dotenv.config()` (plugin client Clerk exige la clé au boot).
- **Composant Sonner généré TS2783** (toastOptions double binding): `computed(
  mergedToastOptions)`. Déviation mineure §4.1 (bug généré).
- **Inngest v4 `createFunction`**: `(options, handler)`, options = `{id,
  triggers:[{event}], retries}`.
- **Webhook retry-storm (#6 review interne)**: user sans email → 200 ack pas 400.

## Current state

- **Quality gate FULL VERT après corrections externes:** typecheck ✓, eslint ✓
  (0 warning), vitest 13/13 ✓, build ✓.
- **Graph régénéré** (`/graphify .`): 278 nœuds, 281 edges, 51 communities.
- **Live vérifié:** Geist rendue correctement (Playwright getComputedStyle).
- **Branche `F2-auth-clerk`**: prête, **non mergée**. Push + PR à faire (ne PAS
  merger — PR part en review externe).

## Next session starts with

1. **`/remember restore`**.
2. **MERGE F2**: la PR `F2-auth-clerk` → `main` part en review externe. Attendre
   validation externe avant merge.
3. **⚠️ PRÉREQUIS F3 (manuel, bloquant)** — à faire AVANT de démarrer F3 :
   - **(a) Configuration Clerk Dashboard** (README § "Configuration Clerk
     Dashboard"): providers Google/email, endpoint webhook
     `https://postulr.online/api/clerk/webhook`, events `user.created/updated/
     deleted`, récupérer `NUXT_CLERK_WEBHOOK_SECRET` → `.env`.
   - **(b) Test signup réel**: créer un compte via l'UI en local (avec tunnel
     webhook) → valider que la ligne `users` apparaît en base. Sans webhook, les
     users Clerk ne sont pas créés en DB → F3 cassé.
   - **(c) Décision RGPD Vercel Blob** à trancher en ouverture F3 (SCOPING §3.2
     + §5): Blob privé + URLs signées vs Blob public. Vérifier capacité Blob
     privé via doc officielle Vercel Blob au moment de F3.
4. **Démarrer F3 (Upload CV + storage)** → `prompts/F3-*.md`. Premier sous-
   objectif: abstraction `StorageProvider`, flux upload direct navigateur →
   Vercel Blob (AGENTS §5.2), passe `users.hasCv` à true.

## Open questions / TODO pour F3+

- Tests routes serveur = logique pure. Envisager `setup()` @nuxt/test-utils
  quand le volume augmente, ou Playwright F10.
- Job `delete-user-cascade` squelette: compléter CV Blob (F3) + applications (F7).
- Composant Sonner modifié (TS2783 fix) — déviation mineure §4.1 documentée.
- **Pas de plugin Clerk manuel** — règle à respecter en F2+ (le module
  s'auto-configure).
