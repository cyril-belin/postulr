# F6 — Job board UI + sauvegarde d'offres

> L'UI consommateur des offres agrégées en F5. Première vraie page de
> recherche du produit.

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** — §4 (règles UI strictes, tokens Tailwind), §5.1 (routes
   REST + Zod), §5.3 (composables SSR-safe).
2. **Lire `SCOPING.md`** §3.7 (job board, badge auto-apply) et §3.5 (sauvegarde
   illimitée même en free).
3. **`/remember restore`**.
4. Vérifier au besoin le composant shadcn-nuxt `Data-Table` (ou équivalent)
  via le registre shadcn-vue avant de l'installer.

## 1. Périmètre

### Inclus
- **Page job board** `app/pages/dashboard/jobs/index.vue` :
  - Barre de recherche (titre/mots-clés), filtres (contractType, location,
    salaryRange, `autoApplyEligible` only), tri (date, salaire).
  - Liste paginée d'offres (cards). Chaque card : titre, entreprise, location,
    type de contrat, salaire (si dispo), badge **« Auto-apply disponible »**
    si `autoApplyEligible`, bouton « Sauvegarder », lien « Voir l'offre »
    (vers le détail interne `/dashboard/jobs/[id]`).
  - SSR via `useFetch('/api/jobs', { key, query })`. Filtres en query string
    (partageables/bookmarkables).
- **Page détail offre** `app/pages/dashboard/jobs/[id].vue` : description
  complète, source(s), premier lien vers le formulaire externe. Bouton
  « Démarrer une candidature » (mène vers F7 — placeholder si F7 absent).
- **Sauvegarde d'offres** : bouton dans la card + page détail. Toggle (sauver /
  retirer). Section « Offres sauvegardées » dans le dashboard.
- **Migration** : table `saved_jobs` (voir §2).
- **Server routes** :
  - `server/api/jobs/index.get.ts` — **étendu** depuis F5 (ajout des filtres
    manquants + `savedByMe` bool par utilisateur).
  - `server/api/jobs/[id].get.ts` — détail.
  - `server/api/saved-jobs/index.get.ts`, `index.post.ts` (save),
    `[jobId].delete.ts` (unsave).
- **Composables** : `useJobs()` (étendu), `useSavedJobs()`.

### Exclus
- Pack de candidature (F7).
- Flow missing data (F8).
- Tracking kanban étendu (les statuts avancés sont manipulés en F7/F9/F10).

## 2. Entités & migrations

### `server/schema/saved-jobs.ts`
```
saved_jobs      userId text PK FK→users, jobId uuid PK FK→jobs,
                savedAt timestamp default now()   -- PK composite (userId, jobId)
```
- Index sur `(userId)`, `(jobId)`.
- Migration générée + appliquée.

## 3. Écrans & composants à produire

- `app/pages/dashboard/jobs/index.vue` (liste + filtres).
- `app/pages/dashboard/jobs/[id].vue` (détail).
- `app/pages/dashboard/saved-jobs.vue` (offres sauvegardées).
- `app/components/jobs/JobCard.vue`, `JobFilters.vue`, `JobBadgeAutoApply.vue`.
- `app/composables/useJobs.ts` (étendu), `useSavedJobs.ts`.
- Routes server : `/api/jobs/[id].get.ts`, `/api/saved-jobs/*`.
- Composants shadcn : `DataTable` (ou `Table` + pagination manuelle),
  `Pagination`, `Badge` (déjà F4), `Sheet`/`Drawer` pour les filtres mobile.
  Tracer dans `ui-registry.md`.

## 4. Critères d'acceptation vérifiables

1. `/dashboard/jobs` affiche une liste paginée d'offres réelles (issues de F5).
2. Les filtres (search, contractType, location, autoApply only) fonctionnent et
   se reflètent dans l'URL (partageable).
3. Le badge « Auto-apply disponible » s'affiche uniquement sur les offres
   éligibles.
4. Sauvegarde / dé-sauvegarde d'une offre persiste et se reflète immédiatement
   (optimistic update OK).
5. `/dashboard/saved-jobs` liste les offres sauvegardées par l'utilisateur.
6. `/dashboard/jobs/[id]` affiche la description complète + la source.
7. SSR : la page jobs s'affiche correctement côté serveur (pas de flash, pas
   de double-fetch — vérifier avec `useFetch`).
8. Responsive mobile (filtres en Drawer/Sheet).

## 5. Sortie obligatoire

- Quality gate complet :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire.
- **`/imprint`** (JobCard + filtres + badge auto-apply + saved-jobs).
- **`/remember save`**.
- Branch git : `F6-job-board`.
