# F4 — Parsing CV par IA + écrans profil

> La feature la plus dense : extraction du PDF vers entités relationnelles +
> écrans de consultation/édition du profil. C'est aussi la première feature
> qui exerce l'abstraction `LlmProvider`.

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** — §5.5 (abstraction `LlmProvider`, sorties Zod
   obligatoires), §5.6 (Inngest), §5.7 (gestion d'erreurs).
2. **Lire `SCOPING.md`** §3.1 (GPT-5.4 nano, abstraction swappable), §3.3
   (entités relationnelles), §3.6 (RGPD).
3. **`/remember restore`**.
4. **Vérifier l'API OpenAI** (modèle `gpt-5.4-nano`, structured outputs / JSON
   mode) via doc officielle OpenAI au moment de l'implémentation. Rappel de
   cadrage : l'identifiant exact du modèle a été posé au scoping, **le contrat
   structured-output se confirme ici**. Ne pas se fier à sa mémoire.
5. Pour l'extraction PDF → texte : évaluer `pdf-parse` ou `unpdf` (préférer une
   lib serverless-friendly, vérifier compat Vercel).

## 1. Périmètre

### Inclus
- **Abstraction `LlmProvider`** dans `server/utils/llm/` : interface
  `generateStructured<T>(prompt, zodSchema, opts)` → `Promise<T>`, implémentation
  `openai.ts` (modèle gpt-5.4-nano, structured outputs), factory selon
  `runtimeConfig`. **Aucun code métier n'importe `openai` directement.**
- **Job Inngest `parse-cv`** (handler réel — F3 n'émettait que l'event) :
  1. Fetch du PDF via `storageProvider.get(blobUrl)`.
  2. Extraction texte (lib choisie).
  3. Prompt structurant vers `llmProvider.generateStructured()` avec un
     **schéma Zod** couvrant : `profile` (headline, targetTitle, location,
     about, salaryMin/max, availability), `experiences[]`, `educations[]`,
     `skills[]` (label + level), `languages[]` (CECRL), `certifications[]`.
  4. Persistance en base (upsert `profiles` + insert enfants). Transactionnelle.
  5. Mise à jour `documents.parsedAt = now()`. Décrémente quota via
     `decrementQuota(userId, 'cv_parse')`.
  6. Retry Inngest borné (max 3). En cas d'échec définitif : `documents.parsedAt`
     reste null, marquer l'erreur dans une colonne `documents.parseError?`.
- **Écrans profil** dans `/dashboard/profile` :
  - Vue onglets : Profil / Expériences / Formations / Compétences / Langues /
    Certifications.
  - Chaque onglet liste les entités parsées, **éditables** (CRUD inline via
    formulaires shadcn).
  - Onglet Profil = champs simples (headline, targetTitle, location, about,
    salaire, disponibilité).
  - Badge « source : parsé » vs « source : manuel » sur skills.
- **Composables** : `useProfile()`, `useExperiences()`, etc. (un par entité,
  via `useFetch` SSR-safe).
- **Server routes** REST CRUD par entité :
  `server/api/profile/*`, `server/api/experiences/*`, etc. Toutes protégées
  par `event.context.auth()`, validées Zod.
- **Re-parse** : bouton dans le dashboard (si quota ok via `checkQuota`).
  Réutilise le job `parse-cv`.

### Exclus
- Job board (F5/F6), applications (F7+).
- PDF export du profil (hors V1).
- Matching intelligent (hors V1).

## 2. Entités & migrations

### `server/schema/profile.ts`
```
profiles         userId text PK FK→users (1:1),
                 headline text?, targetTitle text?, location text?,
                 latitude double?, longitude double?, languages text?,
                 salaryMin int?, salaryMax int?, availability text?, about text?

experiences      id uuid PK, userId text FK, title text notnull,
                 company text notnull, startDate date notnull, endDate date?,
                 description text?, employmentType text?

educations       id uuid PK, userId text FK, degree text notnull,
                 school text notnull, startDate date notnull, endDate date?,
                 mention text?

skills           id uuid PK, userId text FK, label text notnull,
                 level text?, source 'PARSED'|'MANUAL' default 'PARSED'

languages        id uuid PK, userId text FK, language text notnull,
                 levelCECRL text?      -- A1..C2

certifications   id uuid PK, userId text FK, label text notnull,
                 issuer text?, date date?
```
- `documents.parseError text?` ajouté (migration additive).
- Index sur chaque `(userId)` FK.
- Enums Zod partagés dans `shared/utils/`.

## 3. Écrans & composants à produire

- `app/pages/dashboard/profile/index.vue` (shell à onglets).
- Un composant par onglet : `app/components/profile/ProfileTab.vue`,
  `ExperiencesTab.vue`, `EducationsTab.vue`, `SkillsTab.vue`,
  `LanguagesTab.vue`, `CertificationsTab.vue`.
- Éditeurs inline : `app/components/profile/<Entity>Editor.vue` (form shadcn).
- Composables `app/composables/useProfile.ts`, `useExperiences.ts`, ...
- Server routes : `/api/profile`, `/api/experiences`, `/api/educations`,
  `/api/skills`, `/api/languages`, `/api/certifications` (GET list, POST create,
  PATCH update, DELETE).
- `server/utils/llm/types.ts`, `openai.ts`, `index.ts`.
- `server/jobs/parse-cv.ts` (handler réel).
- Composants shadcn : `Tabs`, `Textarea`, `Select`, `DatePicker` (si dispo
  shadcn-vue sinon 3 inputs jour/mois/année), `Table`, `Badge`, `Separator`,
  `Dialog`. Tracer dans `ui-registry.md`.

## 4. Critères d'acceptation vérifiables

1. Upload d'un CV de test (F3) → job `parse-cv` remplit `profiles` + enfants.
   `documents.parsedAt` non null.
2. Le profil est visible dans `/dashboard/profile` (tous onglets peuplés).
3. Édition d'une expérience (titre, dates) persiste en DB via PATCH.
4. Ajout manuel d'un skill → `source='MANUAL'`, badge visible.
5. Suppression d'une expérience fonctionne.
6. Re-parse (bouton dashboard) écrase les données parsées en gardant les
   `source='MANUAL'` (les manuels ne sont pas perdus).
7. CV mal formé (PDF sans texte extractible) → `documents.parseError` renseigné,
   `parsedAt` null, message clair au user, pas de crash.
8. Échec simulé du LLM (clé invalide en dev) → retry Inngest ×3 puis arrêt
   propre, pas de boucle.
9. Un test unitaire valide le schéma Zod du parsing sur un mock de sortie LLM.

## 5. Sortie obligatoire

- Quality gate complet :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire.
- **`/imprint`** (6 onglets profil + éditeurs + nouveaux composants shadcn).
- **`/remember save`**.
- Branch git : `F4-parsing-cv`.
