# SCOPING.md — Postulr

> SaaS d'assistance à la candidature d'emploi pour le marché français.
> Document de cadrage figé le 2026-07-10. Toute évolution doit passer par une
> nouvelle session de grill-me et une version datée.

---

## 1. Contexte produit

**Postulr** (postulr.online) assiste le chercheur d'emploi français de bout en bout :

1. L'utilisateur uploade son CV (PDF) ; une IA le parse et remplit son profil.
2. Un job board agrège de vraies offres (France Travail, Adzuna, Greenhouse,
   Lever), normalisées en base via jobs planifiés Inngest.
3. **Cœur produit — le « pack de candidature »** : l'agent analyse le formulaire
   de l'offre cible, matche avec le profil, génère les réponses et la lettre de
   motivation, signale les données manquantes (flow « missing data »), et fournit
   un deep link vers le formulaire. L'agent **ne soumet pas** à la place de
   l'utilisateur, **sauf** sur les ATS compatibles (Greenhouse/Lever sans
   captcha) où un auto-apply réel est proposé, avec badge « Auto-apply
   disponible » sur les offres concernées.
4. **Monétisation** : freemium via Clerk Billing.
   - Free : job board + profil + 5 packs/mois
   - Pro (~9€/mois) : packs illimités + auto-apply + tracking étendu

### Public cible
Chercheurs d'emploi en France métropolitaine + DOM-TOM. Application en français
uniquement à la V1.

---

## 2. Stack imposée (non négociable)

| Domaine | Technologie |
|---|---|
| Framework | **Nuxt** (dernière stable), TypeScript strict |
| DB | **NeonDB** (Postgres) + **Drizzle ORM** |
| Auth + Billing | **Clerk** (`@clerk/nuxt`) — Google/email + Clerk Billing |
| UI | **shadcn-nuxt** + **Tailwind CSS** — aucun autre système UI |
| Background jobs | **Inngest** via server route Nitro `/api/inngest` |
| Storage PDF | **Vercel Blob** (décision de cadrage) |
| LLM applicatif | **GPT-5.4 nano** (OpenAI), derrière abstraction `LlmProvider` |
| Déploiement | **Vercel** |

> Vérification API obligatoire : pour Nuxt comme pour OpenAI, ne jamais se fier
> à la mémoire. Consulter la doc officielle (MCP Nuxt, doc OpenAI) au moment de
> l'implémentation de chaque feature.

---

## 3. Décisions de cadrage

### 3.1 LLM applicatif — GPT-5.4 nano (OpenAI)

- **Provider principal** : GPT-5.4 nano (OpenAI).
- **Abstraction obligatoire** : interface `LlmProvider` unique, isolée dans
  `server/utils/llm/`. Aucun code métier ne référence OpenAI directement.
  Permet de basculer de LLM sans toucher au reste.
- **Sorties structurées** : JSON strict côté provider (structured outputs),
  **validées par Zod** à la réception. Un échec de validation Zod = erreur
  gérée (retry borné ou fallback), jamais de propagation silencieuse.
- **RGPD** : hébergement US → **consentement explicite « transfert hors-UE »**
  requis dans l'onboarding (table `consents`, type `data_transfer_eu`).
- **Vérification au moment de F4** : identifiant exact du modèle et contrat
  structured-output confirmés via doc officielle OpenAI.

### 3.2 Storage PDF — Vercel Blob

- **Provider** : Vercel Blob (`BLOB_READ_WRITE_TOKEN`).
- **Abstraction maintenue** : `StorageProvider` dans `server/utils/storage/`,
  pour tests et plan B.
- **Upload** : **flux direct navigateur → Vercel Blob** (pas de multipart via
  la server route). Le client appelle `upload()` de `@vercel/blob/client` en
  pointant vers `handleUploadUrl: '/api/cv/upload'` ; la server route Nitro
  orchestre uniquement token + callback (`handleUpload()` avec
  `onBeforeGenerateToken` pour auth + quota + allowlist content-type, et
  `onUploadCompleted` pour persister l'URL en base + déclencher le job Inngest
  de parsing). Détail du flux en AGENTS.md §5.2.
- **Point de vigilance scaling** : egress facturé $0.15/GB après 1GB free.
  Le CV est un objet relu/re-téléchargé → surveiller la courbe d'egress.
  **Seuil de bascule R2** : à définir quand l'egress mensuel dépasse le coût
  d'op d'un switch R2 (estimation : > 50€/mois d'egress).
- **Visibilité des CV — DÉCISION ACTÉE (F3, vérif doc officielle 2026-07-10)** :
  **Blob en accès PRIVÉ + URLs signées à courte durée** servies via route
  authentifiée (`GET /api/cv/download`). Le `blobUrl` brut n'est JAMAIS renvoyé
  au client. Capacité confirmée par la doc Vercel Blob : **Private Blob est GA**
  (changelog « Vercel Private Blob is now generally available ») ; les lectures
  passent par `issueSignedToken` + `presignUrl(operation: 'get')` qui délivrent
  une URL signée à durée courte. Rationale : un CV est une PII sensible ; la
  posture RGPD-strict du projet (consentements tracés en base §3.6) est
  cohérente uniquement avec un stockage privé. **Prérequis infra** : le store
  Blob doit être privé (souvent Vercel Pro) — à valider à l'intégration. La route
  `/api/cv/download` restreint l'accès authentifié quel que soit le mode
  (défense en profondeur). Doc de référence :
  https://vercel.com/docs/vercel-blob/vercel-signed-urls ,
  https://vercel.com/docs/vercel-blob/private-storage .

### 3.3 Schéma de données — Entités relationnelles

Le profil candidat est décomposé en tables liées (pas de JSONB unique). Le
matching et le flow « missing data » deviennent du SQL/Zod déterministe, pas du
LLM.

### 3.4 Offres & packs — Option A + cycle étendu

- Dédup par **hash normalisé** sur
  `(lower(company) + normalized(title) + location + contract_type)`.
- `jobs.sources[]` conserve la trace multi-source d'un même job dédupliqué.
- **Cycle de candidature étendu** (kanban de suivi) :
  `DRAFT → GENERATED → MISSING_DATA → READY → SUBMITTED_MANUAL | SUBMITTED_AUTO → INTERVIEW → OFFER → REJECTED | WITHDRAWN | ARCHIVED`
  (transition vers `ARCHIVED` possible à tout moment).

### 3.5 Free tier — généreux

| Ressource | Free | Pro (~9€/mois) |
|---|---|---|
| Re-parse CV | 1 / mois | Illimité |
| Packs de candidature | **5 / mois** | Illimités |
| Auto-apply ATS | ❌ | ✅ |
| Sauvegarde d'offres | Illimitée | Illimitée |
| Tracking kanban étendu | Illimité | Illimité |
| Job board | Accès complet | Accès complet |

- **Fenêtre glissante 30 jours** (juste pour l'utilisateur, pas de reset
  calendaire arbitraire).
- **Plan unique Pro** (pas de paliers complexes — Clerk Billing gère mal le
  multi-palier).
- Suivi de la marge par utilisateur dans le dashboard produit (coût LLM +
  storage vs revenu).

### 3.6 RGPD — complet

Les 4 obligations couvertes :

1. **Consentement explicite traitement CV** (donnée personnelle enrichie).
2. **Droit à l'oubli immédiat** : route `/api/account/delete` en cascade —
   delete user → delete CV Blob → anonymisation des `applications` (count sans
   PII conservé pour analytics) → purge des données Inngest. **Hard-delete**
   user (pas de soft-delete : le droit à l'oubli exige une suppression
   effective). Implémenté comme **job Inngest asynchrone** (évite le timeout
   de route).
3. **Consentement transfert hors-UE** (LLM OpenAI US) — table `consents`,
   type `data_transfer_eu`.
4. **Conservation illimitée par défaut** + suppression immédiate à la demande.

Table `consents` : `type` (`cv_processing` | `data_transfer_eu` | `marketing`),
`grantedAt`, `ip`, `userId`. **DÉCISION idempotence (F3 — backlog F2 #1)** : la
table est un **journal d'audit append-only** (PAS de contrainte unique
`(userId, type)`). Chaque accord/retrait ajoute une ligne, préservant l'historique
complet des consentements (exigence RGPD : démontrer qui a consenti à quoi et
quand). La lecture de l'état courant prend la ligne la plus récente par type
(cf. `/api/me` qui vérifie la présence d'au moins une ligne de ce type).

### 3.7 Job board — agrégation

- **Crons Inngest différenciés par source** :
  - France Travail + Adzuna : toutes les **6h** (quota limité).
  - Greenhouse + Lever : toutes les **1h** (cheap, fraîcheur critique pour
    l'auto-apply).
  - Pas de sync global unique.
- **Dédup** : hash normalisé + `sources[]` multi-valeurs.
- **Périmètre géographique** : France métropolitaine + DOM-TOM uniquement
  (`country = 'FR'`). Descriptions en français.
- **i18n app** : FR-fr uniquement à la V1. Structure Nuxt i18n préparée mais
  aucune autre langue activée.

### 3.8 Auto-apply ATS — Greenhouse + Lever

- **Périmètre** : Greenhouse + Lever uniquement (endpoints publics stables,
  sans captcha). Abstraction `AtsApplier` swappable.
- **Triple-garde de déclenchement** :
  1. Badge `auto_apply_eligible` sur le job (détecté à l'agrégation).
  2. Activation **explicite** par candidature (jamais implicite).
  3. **Review utilisateur obligatoire** du pack généré avant soumission
     (« Soumettre pour moi »).
- **Vérification de soumission** :
  - Statut HTTP + réponse ATS → `SUBMITTED_AUTO` + `atsSubmissionId`.
  - **Job Inngest J+1** qui re-query l'ATS pour confirmer la persistance.
    En cas d'échec → `REJECTED_BY_ATS` + notification + deep link manuel.
- **Pas de retry automatique** en cas d'échec. L'utilisateur reste maître.

### 3.9 Environnements & conventions

- **NeonDB branching** : un branch DB par feature (git-like).
- **Preview** : branche `main` PR → Vercel preview + NeonDB branch auto.
- **Tests** : **Vitest** (unit + integration) + Vitest UI pour composants
  shadcn-nuxt. **Playwright reporté en F10** (point d'intégration unique).
- **Server routes** : REST typé (`/server/api/...`), entrées Zod, sorties
  Drizzle. Pas de tRPC, pas de RPC custom.
- **Composables** : `useXxx` uniquement pour logique réutilisable
  cross-composants ; un composable par feature.
- **Server utils** dans `/server/utils` ; **pas de logique métier dans les
  routes**.
- **Erreurs** : `createError` standard Nuxt, codes HTTP sémantiques. Pas de
  `throw new Error()` brut.
- **Quality gate par feature** :
  `nuxt typecheck` → `eslint` → `vitest` → `nuxt build`, tous verts, **+ `/review`**.

### 3.10 Périmètre V1

**Dans V1** : F1–F10 complète.

**Hors V1** (explicite) :
- Multi-langues (structure préparée, activation reportée).
- Export PDF du pack généré (l'utilisateur copie-colle).
- Extension navigateur (le deep link suffit).
- Matching intelligent / recommandations personnalisées (job board en
  search-only au lancement).
- Notifications email non transactionnelles (sauf transactionnelles
  critiques : bienvenue, reset password).
- Application mobile.
- Match inversé (recruteurs).
- Analytics produit poussées (PostHog reporté).

---

## 4. Schéma de données de référence

Résumé des entités (le schéma Drizzle complet et typé figurera dans AGENTS.md).
Coches `?` = nullable, `[]` = table liée.

### Utilisateur & profil
```
users              (id Clerk, email, createdAt, plan='free'|'pro',
                    stripeCustomerId?, billingCurrentPeriodEnd?)
consents           (userId, type, grantedAt, ip)
profiles           (userId, headline?, targetTitle?, location?,
                    latitude?, longitude?, languages?, salaryMin?,
                    salaryMax?, availability?, about?)
experiences[]      (userId, title, company, startDate, endDate?,
                    description?, employmentType)
educations[]       (userId, degree, school, startDate, endDate?,
                    mention?)
skills[]           (userId, label, level?, source='PARSED'|'MANUAL')
languages[]        (userId, language, levelCECRL?)
certifications[]   (userId, label, issuer, date?)
documents[]        (userId, kind='CV', blobUrl, parsedAt?, version)
```

### Offres & candidature
```
jobs               (source, sourceId, title, company, location,
                    contractType, salaryMin?, salaryMax?,
                    description, atsType?, atsFormUrl?,
                    autoApplyEligible bool, rawJson jsonb,
                    dedupHash, firstSeenAt)
job_sources[]      (jobId, source)              -- sources multi d'un job dédup
saved_jobs         (userId, jobId, savedAt)
applications       (userId, jobId, status, deepLink?, missingData jsonb,
                    coverLetter?, generatedAnswers jsonb?,
                    submittedAt?, atsSubmissionId?, createdAt, updatedAt)
```

### Énumérations
- `plan` : `free` | `pro`
- `applications.status` : `DRAFT | GENERATED | MISSING_DATA | READY |
  SUBMITTED_MANUAL | SUBMITTED_AUTO | INTERVIEW | OFFER | REJECTED |
  WITHDRAWN | ARCHIVED`
- `skills.source` : `PARSED` | `MANUAL`
- `documents.kind` : `CV`
- `consents.type` : `cv_processing | data_transfer_eu | marketing`
- `jobs.atsType` : `greenhouse | lever | null`

---

## 5. Points de vigilance (à surveiller pendant l'implémentation)

| Risque | Mitigation |
|---|---|
| Coût LLM par utilisateur sur le free tier généreux | Dashboard marge/user ; plafond soft d'alerte ; prêt à ajuster 5→3 packs/mois |
| Egress Vercel Blob qui scale mal | Métrique egress mensuel ; seuil de bascule R2 défini (>50€/mois) |
| Non-déterminisme LLM sur le matching | Matching = SQL déterministe sur entités, pas LLM |
| Auto-apply qui soumet à tort | Triple-garde + review + vérification J+1, pas de retry auto |
| RGPD droit à l'oubri incomplet | Job Inngest asynchrone en cascade, **squelette en F2, complété au fil des features au fur et à mesure que les entités qu'il touche existent (CV Blob en F3, applications en F7), test E2E en F10 avec le reste de la suite Playwright** |
| Dédup imparfaite (doublons visibles job board) | Hash simple en V1 ; fuzzy reporté si doublons > seuil produit |
| CV exposé via URL Blob publique | **Résolu en F3** (cf §3.2) : Blob privé + URLs signées courte durée servies via route authentifiée (`/api/cv/download`). Capacité confirmée doc officielle Vercel Blob (Private Blob GA) |

---

## 6. Décisions explicites différées (Hors V1, à re-cadrer plus tard)

- Extension navigateur.
- Export PDF du pack.
- Matching/recommandations personnalisées.
- Notifications email non transactionnelles.
- Multi-langues.
- Analytics produit (PostHog).
- Dédup fuzzy entreprise/titre.
- Périmètre géographique hors FR.

---

## 7. Prochaines étapes

1. ✅ Cadrage validé (ce document).
2. ⏭️ **AGENTS.md** à la racine — architecture dossiers, conventions, schéma
   Drizzle complet, quality gate, discipline de session. S'appuie sur MCP Nuxt
   + skill `nuxt-technical` + ce SCOPING.
3. ⏭️ Découpage features F1–F10 (Step 3).
4. ⏭️ Prompts `prompts/FX-nom.md` par feature (Step 4).
