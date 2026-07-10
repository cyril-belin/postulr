# F7 — Pack de candidature (analyse formulaire + génération réponses et lettre)

> Le cœur produit. L'agent analyse l'offre, matche avec le profil, génère les
> réponses + lettre de motivation. Le deep link vers le formulaire est fourni.
> **Pas de soumission automatique ici** (F9).

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** — §5.5 (`LlmProvider`, Zod obligatoire), §5.6 (Inngest),
   §5.7 (gestion d'erreurs), §4 (UI).
2. **Lire `SCOPING.md`** §1 (cœur produit = pack), §3.1 (LLM), §3.4 (cycle
   candidature étendu).
3. **`/remember restore`**.
4. Vérifier le contrat structured-output OpenAI si non déjà confirmé en F4.
5. `LlmProvider` et `checkQuota` existent déjà (F3/F4) — les réutiliser.

## 1. Périmètre

### Inclus
- **Migration** : table `applications` (voir §2).
- **Création d'une candidature** : depuis `/dashboard/jobs/[id]`, bouton
  « Démarrer une candidature » → crée une `applications` en statut `DRAFT` →
  redirige vers `/dashboard/applications/[id]`.
- **Job Inngest `generate-pack`** :
  1. Charge le profil complet (F4) + l'offre (F5).
  2. **Analyse du formulaire** : si l'offre a `atsFormUrl` (Greenhouse/Lever),
     fetch du formulaire → extraction des champs (prompt structurant LLM ou
     parsing dédié). Si offre non-ATS → pas de formulaire à analyser, on génère
     juste la lettre.
  3. **Matching** : pour chaque champ du formulaire, trouver la donnée
     correspondante dans le profil (SQL déterministe sur les entités F4, pas de
     LLM). Construit `generatedAnswers` (JSONB validé Zod).
  4. **Génération de la lettre** : `llmProvider.generateStructured()` avec
     schéma Zod `{ coverLetter: string }` (prompt FR, ton pro, adapté à
     l'offre + profil). Validation Zod.
  5. Persistance : `generatedAnswers`, `coverLetter`, statut → `GENERATED`.
     `deepLink` = `atsFormUrl` (ou URL externe de l'offre).
  6. Détection des champs non-matchables → `missingData` JSONB (flow F8).
     Statut → `MISSING_DATA` si au moins un champ manque, sinon `READY`.
  7. Décrémente quota `checkQuota(userId, 'pack')` → `decrementQuota`.
  8. Retry Inngest borné (max 3).
- **Écran candidature** `app/pages/dashboard/applications/[id].vue` :
  - Sections : Lettre générée (éditable), Réponses pré-remplies (par champ),
    Données manquantes (alerte si statut `MISSING_DATA`), Deep link vers le
    formulaire, boutons d'action (copier, régénérer).
  - Liste des candidatures : `/dashboard/applications` (kanban léger ou liste
    par statut — ici juste `DRAFT/GENERATED/MISSING_DATA/READY`, les statuts
    soumission/avancement viennent en F9/F10).
- **Server routes** REST `/api/applications/*` (create, get, list, update,
  regenerate, delete).
- **Composables** `useApplications()`, `useApplication(id)`.

### Exclus
- Flow « missing data » interactif complet + AI autofill (F8 — ici on se
  contente de détecter et alerter).
- Auto-apply et soumission automatique (F9).
- Billing/paywall (F10) — `checkQuota` est encore stub « illimité ».

## 2. Entités & migrations

### `server/schema/applications.ts`
```
applications   id uuid PK default gen_random_uuid(),
                userId text FK→users, jobId uuid FK→jobs,
                status 'DRAFT'|'GENERATED'|'MISSING_DATA'|'READY'|... notnull,
                deepLink text?,
                missingData jsonb?,                 -- [{field, reason}]
                coverLetter text?,
                generatedAnswers jsonb?,            -- {champ: valeur} validé Zod
                submittedAt timestamp?,
                atsSubmissionId text?,
                createdAt timestamp default now(),
                updatedAt timestamp default now()
```
- Index sur `(userId)`, `(jobId)`, `(status)`.
- Enum `status` complète (tous les états du cycle étendu SCOPING §3.4), même
  si certains ne sont manipulés qu'en F9/F10.
- Migration générée + appliquée.

## 3. Écrans & composants à produire

- `app/pages/dashboard/applications/index.vue` (liste par statut).
- `app/pages/dashboard/applications/[id].vue` (détail + lettre + réponses +
  missing data alert + deep link).
- `app/components/applications/CoverLetterEditor.vue`, `GeneratedAnswersList.vue`,
  `MissingDataAlert.vue`, `ApplicationStatusBadge.vue`.
- `app/composables/useApplications.ts`.
- Server routes `/api/applications/*`.
- `server/jobs/generate-pack.ts` (Inngest handler).
- Composants shadcn : `Textarea` (déjà F4), `Alert`, `Accordion` (réponses par
  section), `CopyButton` (composant maison basé sur Button). Tracer dans
  `ui-registry.md`.

## 4. Critères d'acceptation vérifiables

1. Bouton « Démarrer une candidature » sur `/dashboard/jobs/[id]` crée une
   application `DRAFT` et redirige vers le détail.
2. Le job `generate-pack` remplit `coverLetter` + `generatedAnswers`, passe le
   statut à `READY` (ou `MISSING_DATA` si champ manquant).
3. La lettre générée est en français, cohérente avec le profil et l'offre
   (validation humaine sur un cas test).
4. Le deep link vers le formulaire est présent et fonctionnel.
5. Régénération (bouton) relance le job et écrase les contenus générés.
6. Liste des candidatures groupée par statut, à jour.
7. Échec LLM simulé → retry ×3 puis statut bloqué + message user, pas de crash.
8. Un test unitaire valide `generatedAnswers` contre son schéma Zod.

## 5. Sortie obligatoire

- Quality gate complet :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire.
- **`/imprint`** (écran candidature + sous-composants).
- **`/remember save`**.
- Branch git : `F7-pack-candidature`.
