# F2 — Auth Clerk + middleware gating « CV requis avant dashboard »

> Authentification + gating onboarding. Toutes les features suivantes
> supposent un utilisateur authentifié.

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** (conventions, §5.1 sur `event.context.auth()` Clerk,
   anti-patterns, quality gate).
2. **Lire `SCOPING.md`** §3.6 (RGPD — consentements requis à l'onboarding).
3. **`/remember restore`**.
4. Vérifier l'API `@clerk/nuxt` via doc Clerk Nuxt (MCP ou
   `https://clerk.com/docs/references/nuxt/overview`). Rappel vérifié en F1 :
   `event.context.auth()` est une **fonction** côté serveur.

## 1. Périmètre

### Inclus
- Installation + configuration `@clerk/nuxt` (clés via `runtimeConfig`).
- Pages Clerk intégrées : sign-in, sign-up (composants Clerk montés dans
  `app/layouts/auth.vue`). Middleware Clerk actif.
- **Plugin** `app/plugins/clerk.client.ts` (init SDK côté client).
- **Webhook Clerk** `server/api/clerk/webhook.post.ts` : synchronise la
  création utilisateur Clerk → insertion dans `users` (id = Clerk userId,
  email, plan='free') + trace `consents` initiaux si fournis dans les metadatas.
- **Onboarding consentement RGPD** : après signup, l'utilisateur est redirigé
  vers une page `/onboarding` où il doit accepter :
  - `cv_processing` (requis pour continuer)
  - `data_transfer_eu` (requis — LLM OpenAI US)
  - `marketing` (optionnel)
  Refus d'un requis = blocage, message clair. Acceptation = insert `consents`
  + metadatas Clerk mises à jour.
- **Middleware de gating** `app/middleware/cv-required.ts` : redirige tout
  utilisateur sans `documents` (CV uploadé) de `/dashboard/**` vers
  `/onboarding/upload-cv` (page placeholder créée, le vrai upload vient en F3).
  Le middleware **ne s'applique pas** à `/onboarding`, `/sign-*`, `/`.
- **Composable** `useCurrentUser()` : expose `{ user, isAuthed, plan,
  hasCv, consents }` (SSR-safe via `useState`).
- **Page dashboard placeholder** `app/pages/dashboard/index.vue` : affiche
  « Bienvenue + email + état CV (aucun) » et un lien vers upload (placeholder).
- **Déconnexion** gérée par Clerk (bouton dans le header du layout default).
- **Route de suppression compte** `server/api/account/delete.post.ts` :
  envoie l'événement Inngest `delete-user-cascade` (job lui-même implémenté en
  F3 quand le storage existe ; ici juste l'event trigger). Marque l'utilisateur
  pour suppression, et un bouton « Supprimer mon compte » dans le dashboard.

### Exclus
- Upload CV réel (F3), parsing (F4), tout le reste.
- Job Inngest `delete-user-cascade` complet (implémenté en F3 — ici on ne fait
  qu'émettre l'event, handler no-op).
- Billing (F10).

## 2. Entités & migrations

- Aucune nouvelle entité (users + consents existent depuis F1).
- Vérifier que `consents` reçoit bien les 3 types à l'onboarding.

## 3. Écrans & composants à produire

- `app/pages/sign-in.vue`, `app/pages/sign-up.vue` — wrappers Clerk.
- `app/pages/onboarding.vue` — consentements RGPD (3 checkboxes, 2 requises).
- `app/pages/onboarding/upload-cv.vue` — placeholder (« Le système d'upload
  arrive bientôt » + bouton désactivé).
- `app/pages/dashboard/index.vue` — dashboard placeholder.
- `app/middleware/cv-required.ts`.
- `app/plugins/clerk.client.ts`.
- `app/composables/useCurrentUser.ts`.
- `server/api/clerk/webhook.post.ts`.
- `server/api/account/delete.post.ts`.
- Composants shadcn additionnels : `Checkbox`, `Form` (composant de formulaire
  shadcn), `Sonner` (toasts). Tracer dans `ui-registry.md`.

## 4. Critères d'acceptation vérifiables

1. Un utilisateur peut s'inscrire (Google + email) et se connecter.
2. Après inscription, redirection vers `/onboarding`. Sans accepter
   `cv_processing` + `data_transfer_eu`, impossible d'accéder au dashboard
   (message clair).
3. Après consentement, redirection vers `/onboarding/upload-cv` (placeholder).
4. Tentative d'accès directe à `/dashboard` sans CV → redirection vers
   `/onboarding/upload-cv`.
5. Le webhook Clerk crée bien la ligne `users` à l'inscription (vérifier en DB).
6. `useCurrentUser()` expose des données cohérentes (email, hasCv=false).
7. Le bouton « Supprimer mon compte » émet l'event Inngest (vérifier dans le
   dashboard Inngest dev) — le handler peut être no-op à ce stade.
8. Logout fonctionne via le header.

## 5. Sortie obligatoire

- Quality gate complet :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire.
- **`/imprint`** (composants shadcn ajoutés : Checkbox, Form, Sonner).
- **`/remember save`**.
- Branch git : `F2-auth-clerk`.
