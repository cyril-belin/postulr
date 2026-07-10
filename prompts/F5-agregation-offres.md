# F5 — Agrégation offres (Inngest cron + table jobs normalisée + dédup)

> Backend d'agrégation uniquement. Aucun UI dans cette feature (le job board
> vient en F6). C'est une feature « plomberie ».

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** — §5.6 (Inngest, crons), §5.5 (abstractions providers).
2. **Lire `SCOPING.md`** §3.7 (job board : crons différenciés 6h/1h, dédup hash
   + sources multi, périmètre FR + DOM-TOM).
3. **`/remember restore`**.
4. Vérifier les APIs d'agrégation via doc officielle au moment de l'implémentation :
   - France Travail API (OAuth, périmètre, endpoints offres) — doc officielle
     France Travail.
   - Adzuna API (clé, endpoints, rate limit 1000/jour free).
   - Greenhouse public endpoints (`boards/<board>/jobs`).
   - Lever public endpoints (`postings.json` par entreprise).
   Ne pas se fier à sa mémoire pour ces contrats.

## 1. Périmètre

### Inclus
- **Abstraction `JobSource`** dans `server/utils/sources/` : interface
  `fetchJobs(since?) → RawJob[]`. Implémentations : `france-travail.ts`,
  `adzuna.ts`, `greenhouse.ts`, `lever.ts`. Factory par source.
- **Jobs Inngest cron différenciés** dans `server/jobs/` :
  - `aggregate-jobs-ft` — cron **toutes les 6h**.
  - `aggregate-jobs-adzuna` — cron **toutes les 6h**.
  - `aggregate-jobs-ats` — cron **toutes les 1h** (Greenhouse + Lever).
  Chaque job : fetch → normalisation → dédup → upsert.
- **Normalisation** : chaque `RawJob` source-spécifique est mappé vers le
  schéma `jobs` canonique (titre, entreprise, location, contractType, salaire,
  description, atsType, atsFormUrl, autoApplyEligible). Filtrage
  `country = 'FR'` (métropole + DOM-TOM).
- **Détection auto-apply** : pour les sources ATS (Greenhouse/Lever), détecter
  la présence d'un formulaire sans captcha → `autoApplyEligible = true` +
  `atsType` + `atsFormUrl`. Détecton heuristique au lancement (la présence
  d'un `job_application_url` Greenhouse suffit à poser le badge ; la vérification
  fine « sans captcha » se confirme en F9).
- **Dédup** : hash normalisé sur
  `(lower(trim(company)) + '|' + normalized(title) + '|' + normalized(location)
   + '|' + contractType)`. Normalisation = lowercase, suppression accents,
  collapse whitespace. Si un job avec même `dedupHash` existe déjà → on ajoute
  la source à `job_sources` (pas de nouvel insert). `firstSeenAt` inchangé.
- **Migration** : tables `jobs`, `job_sources` (voir §2).
- **Server route** `server/api/jobs/index.get.ts` : list (avec filtres basiques
  search/contractType/location) — sera consommée par F6. Paginée.
- **Composable `useJobs()`** minimal (prêt pour F6, non affiché).
- **Tableau de bord ops** (optionnel, dev-only) : une page `/admin/jobs`
  protégée par un flag runtimeConfig qui affiche compteurs (total jobs, doublons
  fusionnés, dernière exécution cron par source). Aide à valider la dédup.

### Exclus
- UI job board complet (F6) — ici juste l'API.
- Sauvegarde d'offres par l'utilisateur (F6).
- Parsing de formulaire d'offre (F7).

## 2. Entités & migrations

### `server/schema/jobs.ts`
```
jobs            id uuid PK default gen_random_uuid(),
                source text notnull,             -- source qui a créé l'entrée
                sourceId text notnull,           -- id chez la source
                title text notnull, company text notnull,
                location text?, contractType text?,
                salaryMin int?, salaryMax int?, description text notnull,
                atsType 'greenhouse'|'lever'?,
                atsFormUrl text?,
                autoApplyEligible boolean default false,
                rawJson jsonb notnull,           -- payload source brut
                dedupHash text notnull,
                firstSeenAt timestamp default now(),
                createdAt timestamp default now()
                UNIQUE(source, sourceId)
                UNIQUE(dedupHash)

job_sources     jobId uuid PK FK→jobs, source text PK   -- PK composite
                firstSeenFromSourceAt timestamp default now()
```
- Index sur `(title), (company), (location), (contractType), (autoApplyEligible)`.
- Enums partagés Zod dans `shared/utils/`.

## 3. Écrans & composants à produire

- **Aucun UI produit** (feature plomberie). Sauf `/admin/jobs` dev-only
  optionnel ( compteurs simples, pas de design soigné).
- `server/utils/sources/{france-travail,adzuna,greenhouse,lever}.ts` + `types.ts`
  + `index.ts` (factory + normalisation + dédup).
- `server/jobs/aggregate-jobs-ft.ts`, `aggregate-jobs-adzuna.ts`,
  `aggregate-jobs-ats.ts`.
- `server/api/jobs/index.get.ts`.
- `app/composables/useJobs.ts`.
- Variables d'env ajoutées au runtimeConfig (cf AGENTS.md §9).

## 4. Critères d'acceptation vérifiables

1. Déclenchement manuel (Inngest dev dashboard) de chaque cron → lignes
   insérées dans `jobs` depuis chaque source.
2. Un même job venant de France Travail ET Adzuna → une seule ligne `jobs`,
   deux entrées dans `job_sources`.
3. `dedupHash` identique pour des libellés variant (accents, casse, espaces).
4. Aucun job hors France (vérifier `location` non vide et FR).
5. Jobs Greenhouse/Lever avec formulaire → `autoApplyEligible=true`,
   `atsType` + `atsFormUrl` renseignés.
6. `GET /api/jobs?search=dev&contractType=CDI` filtre correctement, paginé.
7. Retry Inngest borné : une source en panne (401) ne bloque pas les autres.
8. `/admin/jobs` affiche total + doublons fusionnés + dernière exécution.
9. Un test unitaire couvre la normalisation/dédup (entrées en double → 1 hash).

## 5. Sortie obligatoire

- Quality gate complet :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire.
- **`/imprint`** NON requis (pas d'UI produit — sauf admin dev-only).
- **`/remember save`**.
- Branch git : `F5-agregation-offres`.
