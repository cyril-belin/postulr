# F10 — Clerk Billing + paywall + limites free tier (+ E2E Playwright)

> Monétisation réelle : remplace les stubs `checkQuota` par les limites free
> tier, branche Clerk Billing, ajoute le tracking kanban étendu et l'E2E
> Playwright. **Dernière feature de la V1.**

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** — §5.1 (routes), §5.7 (erreurs, code 402/403 plan),
   §8 (quality gate), §10 (discipline).
2. **Lire `SCOPING.md`** §3.5 (**limites free tier exactes**), §3.4 (cycle
   étendu — statuts `INTERVIEW/OFFER/...`).
3. **`/remember restore`**.
4. Vérifier **Clerk Billing** (plans, webhooks, métadonnées `plan` /
   `billingCurrentPeriodEnd`) via doc officielle Clerk. Ne pas se fier à sa
   mémoire.
5. Vérifier **Playwright + Nuxt** via doc `@nuxt/test-utils` / Playwright.

## 1. Périmètre

### Inclus

#### 1a. Limites free tier (remplacement des stubs)
- **Remplacer** le corps de `server/utils/quota.ts` (stub « illimité » depuis
  F3) par l'implémentation réelle. **L'interface `checkQuota` / `decrementQuota`
  ne change pas** → aucun appelant à modifier (F3 cv_parse, F7 pack, F9
  auto_apply consomment déjà l'interface).
- Limites exactes (SCOPING §3.5) :
  - Free : 1 `cv_parse` / 30j, 5 `pack` / 30j, 0 `auto_apply`.
  - Pro : illimité sur tout.
  - Fenêtre glissante 30j (compter sur les 30 derniers jours via
    `documents.parsedAt` pour cv_parse, `applications.createdAt` pour pack,
    `applications.submittedAt WHERE status='SUBMITTED_AUTO'` pour auto_apply).
- Helper `getUserPlan(userId)` lit `users.plan` (mis à jour par webhook Clerk).

#### 1b. Clerk Billing
- Configuration du plan Pro (~9€/mois) dans Clerk Dashboard (feature attendue
  côté Clerk — documenter la marche à suivre, pas coder).
- **Webhook Clerk Billing** `server/api/clerk/webhook.post.ts` — **étendu**
  depuis F2 : écoute les events `user.updated` (métadonnées `plan` +
  `billingCurrentPeriodEnd`), synchronise `users.plan` et
  `users.billingCurrentPeriodEnd`.
- **Page pricing** `app/pages/pricing.vue` : comparatif free/pro, bouton
  « Passer à Pro » (utilise le composant Clerk Billing `<CheckoutButton>` ou
  équivalent vérifié en doc).
- **Page account** `app/pages/dashboard/account/index.vue` : plan courant,
  fin de période, bouton gestion d'abonnement (Clerk Customer Portal),
  bouton suppression compte (déjà F2/F3).
- **Paywall** : quand `checkQuota` refuse (free tier atteint), UI propose
  l'upgrade (modal/redirect vers `/pricing`). Server routes renvoient
  **402 Payment Required** (ou 403) avec payload `{ feature, limit, window }`
  pour que le client affiche le bon message.

#### 1c. Tracking kanban étendu
- Les statuts `INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN`, `ARCHIVED` sont
  enfin manipulables (définis en F7, non atteignables avant).
- **Page candidatures** `app/pages/dashboard/applications/index.vue` —
  **refaite en kanban** (colonnes par statut du cycle étendu SCOPING §3.4).
  Drag-and-drop pour faire avancer `READY → SUBMITTED → INTERVIEW → OFFER`.
- Server route `server/api/applications/[id].status.patch.ts` : transition de
  statut (avec validation des transitions autorisées — pas de saut arbitraire).

#### 1d. E2E Playwright
- Installation + config Playwright (`@nuxt/test-utils` + `@playwright/test`).
- Scénarios E2E critiques (smoke suite) :
  1. Signup → onboarding consentements → refus requi → acceptation → upload
     placeholder.
  2. Upload CV → parsing → profil peuplé.
  3. Recherche job board → sauvegarde.
  4. Création candidature → génération pack → résolution missing data → READY.
  5. Free tier atteint (5 packs) → paywall affiché.
  6. Soumission manuelle (« J'ai postulé ») → kanban avance.
- Les E2E tournent sur un environnement de test dédié (NeonDB branch test).

### Exclus
- Toute feature hors V1 (cf SCOPING §6) : extension nav, export PDF,
  notifications email, matching intelligent, multi-langue, PostHog.
- Webhooks de paiement spécifiques Stripe si Clerk Billing les masque (vérifier).

## 2. Entités & migrations

- **Aucune nouvelle table**. `users.plan` et `users.billingCurrentPeriodEnd`
  existent (F1). `applications.status` couvre tout le cycle (F7).
- Si Clerk Billing nécessite un `users.clerkBillingId`, colonne additive.

## 3. Écrans & composants à produire

- `app/pages/pricing.vue`.
- `app/pages/dashboard/account/index.vue`.
- `app/pages/dashboard/applications/index.vue` — **refaite en kanban**.
- `app/components/applications/KanbanBoard.vue`, `KanbanColumn.vue`,
  `ApplicationCard.vue`.
- `app/components/billing/PaywallModal.vue`, `PlanBadge.vue`.
- `server/utils/quota.ts` — **réécrit** (interface inchangée).
- `server/api/clerk/webhook.post.ts` — **étendu** (events billing).
- `server/api/applications/[id]/status.patch.ts`.
- `test/e2e/*.spec.ts` (Playwright).
- Composants shadcn : `Drag`/`Droppable` (via une lib DnD compatible — vérifier
  avant), `Modal`/`Dialog` (déjà F2). Tracer dans `ui-registry.md`.

## 4. Critères d'acceptation vérifiables

1. `checkQuota('pack')` retourne `{allowed:false}` après 5 packs en free sur
   fenêtre 30j, `{allowed:true}` en Pro.
2. Tentative de 6e pack en free → server route 402 + paywall client.
3. Upgrade Pro via Clerk Billing → `users.plan='pro'` synchronisé par webhook,
   quotas levés immédiatement.
4. Downgrade → `plan='free'` synchronisé, quotas réappliqués.
5. Kanban candidatures : drag `READY → SUBMITTED_MANUAL → INTERVIEW → OFFER`.
6. Transition de statut invalide (ex. `DRAFT → OFFER`) rejetée par la route.
7. Page account affiche plan + fin de période + bouton Customer Portal.
8. Suite E2E Playwright verte (6 scénarios ci-dessus).
9. Le quality gate inclut désormais `npx playwright test` en complément.

## 5. Sortie obligatoire

- Quality gate complet **étendu** :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build && npx playwright test
  ```
- **`/review`** obligatoire.
- **`/imprint`** (kanban + paywall + pricing + account).
- **`/remember save`**.
- Branch git : `F10-billing-e2e`.
- **V1 prête pour déploiement production.**
