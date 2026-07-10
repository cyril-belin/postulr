# F9 — Auto-apply ATS + statuts + vérification de soumission

> La feature la plus risquée : soumission **réelle** au nom de l'utilisateur.
> Triple-garde strict (SCOPING §3.8).

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** — §5.5 (abstraction `AtsApplier`), §5.6 (Inngest),
   §5.7 (gestion d'erreurs).
2. **Lire `SCOPING.md`** §3.8 (**intégrale** — triple-garde, vérification J+1,
   pas de retry auto).
3. **`/remember restore`**.
4. Vérifier les endpoints publics Greenhouse + Lever via doc officielle au
   moment de l'implémentation. Ne pas se fier à sa mémoire pour ces contrats
   (notamment le format de payload de soumission).

## 1. Périmètre

### Inclus
- **Abstraction `AtsApplier`** dans `server/utils/ats/` : interface
  `submit(applicationId) → { atsSubmissionId }` et
  `verify(atsSubmissionId) → { status }`. Implémentations `greenhouse.ts` et
  `lever.ts`. Factory selon `jobs.atsType`.
- **Conditions de déclenchement (triple-garde)** — **strict, non négociable** :
  1. `jobs.autoApplyEligible === true` (détecté en F5).
  2. L'utilisateur **active explicitement** l'auto-apply sur la candidature
     (toggle dans l'écran candidature, pas de défaut coché).
  3. **Review utilisateur obligatoire** du pack généré (`coverLetter` +
     `generatedAnswers`) avant de cliquer « Soumettre pour moi ». Le bouton
     est désactivé tant que `status !== 'READY'` (F7/F8 doivent être résolus).
- **Soumission** :
  - Server route `server/api/applications/[id]/submit.post.ts` : vérifie les 3
    gardes, appelle `atsApplier.submit()`, met à jour `status='SUBMITTED_AUTO'`,
    `submittedAt=now()`, `atsSubmissionId`. Décrémente quota auto-apply
    (`checkQuota(userId, 'auto_apply')`).
  - Le `submit()` de l'ATS mappe `generatedAnswers` vers le payload attendu
    par l'ATS (validation Zod du payload avant envoi).
- **Vérification J+1** :
  - Job Inngest `verify-ats-submission` schedulé à J+1 (24h) après chaque
    `SUBMITTED_AUTO`. Appelle `atsApplier.verify(atsSubmissionId)`.
  - Si `confirmed` → statut reste `SUBMITTED_AUTO` (ou avance en `INTERVIEW`
    plus tard via F10 tracking).
  - Si `failed` → statut `REJECTED_BY_ATS`, notification utilisateur (toast +
    badge sur la candidature), deep link vers le formulaire manuel en fallback.
- **Pas de retry automatique** en cas d'échec de `submit()` ou `verify()`.
  L'utilisateur garde la main (deep link manuel).
- **Soumission manuelle** aussi couverte : un bouton « J'ai postulé » permet à
  l'utilisateur de marquer `status='SUBMITTED_MANUAL'` (+ `submittedAt`) sans
  auto-apply (pour les offres non-ATS). Utile pour le tracking.
- **Écran candidature mis à jour** : toggle « Activer l'auto-apply », bouton
  « Soumettre pour moi » (gardienné), bouton « J'ai postulé », section statut
  + `atsSubmissionId` + résultat vérification.
- **Liste candidatures** : statuts étendus affichés (`SUBMITTED_AUTO`,
  `REJECTED_BY_ATS`).

### Exclus
- Billing / paywall réel (F10) — `checkQuota('auto_apply')` est encore stub.
- Tracking kanban complet `INTERVIEW/OFFER` (F10).
- ATS autres que Greenhouse/Lever (hors V1).

## 2. Entités & migrations

- **Aucune nouvelle table**. `applications.status` (défini en F7) couvre déjà
  `SUBMITTED_AUTO | SUBMITTED_MANUAL | REJECTED_BY_ATS | ...`.
- Si besoin, colonne additive `applications.atsVerifiedAt timestamp?` et
  `applications.atsVerifyResult text?`.

## 3. Écrans & composants à produire

- `app/pages/dashboard/applications/[id].vue` — **mis à jour** : section
  auto-apply (toggle + bouton soumission gardée) + section statut/vérification.
- `app/components/applications/AutoApplyPanel.vue` (toggle + bouton + garde UI).
- `app/components/applications/SubmissionStatus.vue` (statut + atsSubmissionId
  + résultat vérif J+1).
- `server/utils/ats/types.ts`, `greenhouse.ts`, `lever.ts`, `index.ts`.
- `server/api/applications/[id]/submit.post.ts`.
- `server/api/applications/[id]/mark-manual.post.ts` (« J'ai postulé »).
- `server/jobs/verify-ats-submission.ts` (Inngest J+1).
- Composants shadcn : `Switch` (toggle auto-apply), `Alert` (déjà F7),
  `Badge` (déjà F4). Tracer dans `ui-registry.md`.

## 4. Critères d'acceptation vérifiables

1. Le toggle « Activer l'auto-apply » n'apparaît que sur les offres
   `autoApplyEligible=true`.
2. Bouton « Soumettre pour moi » désactivé tant que `status !== 'READY'` ou
   toggle off.
3. Soumission réussie → `status='SUBMITTED_AUTO'`, `atsSubmissionId` présent,
   `submittedAt` daté. Appel réel à l'ATS (sur un board de test Greenhouse).
4. Le job J+1 re-query l'ATS. Sur un cas de test « confirmé » → statut reste
   soumis. Sur un cas « échec » → `REJECTED_BY_ATS` + notif + deep link manuel.
5. Échec du `submit()` (ATS injoignable) → erreur utilisateur claire, **pas de
   retry auto**, deep link manuel proposé.
6. « J'ai postulé » marque `SUBMITTED_MANUAL` sans appel ATS.
7. Le payload envoyé à l'ATS est validé par Zod avant envoi.
8. Aucun soumission implicite possible (3 gardes testés individuellement).

## 5. Sortie obligatoire

- Quality gate complet :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire — **double attention** sur cette feature (risque
  soumission involontaire).
- **`/imprint`** (AutoApplyPanel + SubmissionStatus).
- **`/remember save`**.
- Branch git : `F9-auto-apply`.
