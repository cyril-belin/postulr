# F8 — Flow « missing data » + AI autofill

> Résolution interactive des données manquantes détectées en F7. L'utilisateur
> complète les trous, avec assistance IA pour pré-remplir quand c'est possible.

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** — §5.5 (LLM), §5.7 (erreurs), §4 (UI).
2. **Lire `SCOPING.md`** §1 (flow « missing data » = cœur produit).
3. **`/remember restore`**.
4. `LlmProvider`, `applications` et `missingData` existent (F4/F7).

## 1. Périmètre

### Inclus
- **Détection affinée** : le `missingData` JSONB de F7 contient déjà
  `[{field, reason}]`. F8 l'enrichit d'une `suggestion` quand le LLM peut
  déduire une valeur à partir du contexte (profil + offre + autres champs).
  Re-génère `missingData` via une étape additionnelle du job `generate-pack`
  (ou un job dédié `suggest-missing-data`).
- **Écran « Données manquantes »** : dans la candidature
  `/dashboard/applications/[id]`, section interactive quand
  `status === 'MISSING_DATA'` :
  - Liste chaque champ manquant avec : label, raison, **suggestion IA** (si
    dispo) avec bouton « Utiliser », ou un champ de saisie manuel.
  - À chaque complétion, l'utilisateur valide → patch de
    `generatedAnswers[champ]` + retrait de l'entrée dans `missingData`.
  - Quand `missingData` est vide → statut `READY`.
- **AI autofill** : bouton « Tout pré-remplir avec l'IA » qui applique toutes
  les suggestions valides d'un coup (avec review possible avant validation).
- **Server routes** :
  - `server/api/applications/[id]/missing-data.get.ts` — liste enrichie.
  - `server/api/applications/[id]/missing-data/[field].patch.ts` — soumet une
    valeur pour un champ (manuelle ou suggestion adoptée).
  - `server/api/applications/[id]/autofill.post.ts` — applique toutes les
    suggestions IA.
- **Job Inngest `suggest-missing-data`** (ou extension de `generate-pack`) :
  pour chaque champ manquant, prompt LLM avec contexte → suggestion structurée
  validée Zod. Retry borné.

### Exclus
- Auto-apply et soumission (F9).
- Billing (F10).

## 2. Entités & migrations

- **Aucune migration structurelle**. `missingData` JSONB évolue :
  `[{field, reason, suggestion?}]`.
- Si besoin, ajout colonne `applications.lastAutofillAt timestamp?` (additive).

## 3. Écrans & composants à produire

- `app/components/applications/MissingDataAlert.vue` — **étendu** depuis F7
  (devient interactif : liste + suggestions + inputs).
- `app/components/applications/MissingDataItem.vue` — un champ manquant
  (label + raison + suggestion + input).
- `app/pages/dashboard/applications/[id].vue` — **mis à jour** pour intégrer la
  section interactive.
- Server routes `/api/applications/[id]/missing-data/*` et `autofill.post.ts`.
- `server/jobs/suggest-missing-data.ts` (ou extension `generate-pack`).
- Composants shadcn : `Tooltip` (raison d'un manquant), `Skeleton` (pendant la
  suggestion IA). Tracer dans `ui-registry.md`.

## 4. Critères d'acceptation vérifiables

1. Une candidature `MISSING_DATA` affiche la liste interactive des champs
   manquants avec raison + suggestion (si dispo).
2. « Utiliser » sur une suggestion remplit `generatedAnswers[champ]` et retire
   le champ de `missingData`.
3. Saisie manuelle d'une valeur fonctionne pareil.
4. Bouton « Tout pré-remplir » applique toutes les suggestions valides.
5. Quand `missingData` est vide → statut passe à `READY` automatiquement.
6. Une suggestion IA est validée par Zod (échec → pas de suggestion affichée,
   l'utilisateur saisit manuellement).
7. Pas de perte des `generatedAnswers` existants lors d'une régénération F7
   (merge, pas écrasement des champs déjà remplis manuellement).

## 5. Sortie obligatoire

- Quality gate complet :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire.
- **`/imprint`** (section missing data interactive + sous-composants).
- **`/remember save`**.
- Branch git : `F8-missing-data`.
