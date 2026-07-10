# F3 — Upload CV + storage

> Upload PDF vers Vercel Blob via flux client + déclenchement du parsing
> (parsing lui-même en F4). Implémente aussi le job de suppression RGPD.

---

## 0. Démarrage obligatoire

1. **Lire `AGENTS.md`** — notamment **§5.2 « Upload CV — flux client + serveur »**
   (le pattern exact : `upload()` client + `handleUpload()` server, pas de
   multipart) et §5.5/5.6 (abstractions providers + Inngest).
2. **Lire `SCOPING.md`** §3.2 (Vercel Blob + abstraction StorageProvider) et
   §3.6 (RGPD — job cascade).
3. **`/remember restore`**.
4. Vérifier `@vercel/blob` (client upload + `handleUpload`) via doc officielle
   `https://vercel.com/docs/vercel-blob/client-upload`. Ne pas se fier à sa
   mémoire.

## 1. Périmètre

### Inclus
- **Abstraction `StorageProvider`** dans `server/utils/storage/` :
  interface `put` / `get` / `delete`, implémentation `vercel-blob.ts`,
  factory selon `runtimeConfig`.
- **Composant d'upload** `app/components/cv/CvUpload.vue` : zone de drop +
  bouton, utilise `upload()` de `@vercel/blob/client` avec
  `handleUploadUrl: '/api/cv/upload'`. Progress bar. Allowlist `.pdf` côté UI.
- **Server route** `server/api/cv/upload.ts` via `handleUpload()` :
  - `onBeforeGenerateToken(req)` : `event.context.auth()` (Clerk) requis,
    **allowlist stricte `application/pdf`**, taille max 5 Mo, contrôle quota
    via `checkQuota(userId, 'cv_parse')` (stub — cf note ci-dessous).
  - `onUploadCompleted(payload)` : persiste dans `documents` (blobUrl,
    version=1, kind='CV'), **déclenche l'event Inngest `parse-cv`** (handler
    vient en F4 — ici juste émettre l'event).
- **Migration** : table `documents` (voir §2).
- **Liste des CV** dans le dashboard : versions uploadées, statut
  (parsed/pending), bouton re-upload.
- **Job Inngest `delete-user-cascade`** complet (déclenché depuis F2) : hard-delete
  user → `storageProvider.delete()` chaque `documents[].blobUrl` → anonymisation
  des `applications` (pas encore de lignes, mais la logique est en place) →
  delete `documents`, `consents`, `profiles`... → delete `users`.
- **Re-upload** : un nouvel upload incrémente `documents.version` et met
  `parsedAt = null` jusqu'au prochain parsing.

### Stub `checkQuota` (point de dépendance transverse)
Les limites free tier (1 re-parse/mois, 5 packs/mois, auto-apply payant) sont
**implémentées en F10**, mais elles sont **consommées dès F3** (re-parse),
F7 (packs), F9 (auto-apply). Pour éviter du retrofit :
- Créer **dès F3** `server/utils/quota.ts` avec `checkQuota(userId, feature)`
  qui retourne `{ allowed: true }` (toujours autorisé) et
  `decrementQuota(userId, feature)` no-op.
- F10 remplacera le corps par la vraie implémentation (fenêtre glissante 30j,
  distinction free/pro). **L'interface ne change pas** → aucun code appelant à
  modifier en F10.

### Exclus
- Parsing IA du PDF (F4).
- Job `parse-cv` handler (F4 — F3 ne fait qu'émettre l'event).
- Table `profiles` et entités profil (F4).
- Billing réel (F10).

## 2. Entités & migrations

### `server/schema/documents.ts`
```
documents    id uuid PK default gen_random_uuid(),
             userId text FK→users,
             kind 'CV',
             blobUrl text notnull,
             version int default 1,
             parsedAt timestamp?,
             createdAt timestamp default now()
```
- Index sur `documents(userId)`.
- Migration générée + appliquée sur le branch de dev.

## 3. Écrans & composants à produire

- `app/components/cv/CvUpload.vue` (zone drop + progress).
- `app/pages/onboarding/upload-cv.vue` — version réelle (remplace placeholder F2).
- `app/pages/dashboard/index.vue` — **mis à jour** : section « Mes CV » (liste
  versions + statut parsed/pending + re-upload). Le middleware `cv-required`
  (F2) est désormais satisfait dès qu'une ligne `documents` existe.
- `server/utils/storage/types.ts`, `vercel-blob.ts`, `index.ts`.
- `server/api/cv/upload.ts` (handleUpload).
- `server/jobs/delete-cascade.ts` (Inngest handler complet).
- `server/utils/quota.ts` (stub interface stable).
- Composants shadcn : `Progress`, `AlertDialog` (confirmation suppression).
  Tracer dans `ui-registry.md`.

## 4. Critères d'acceptation vérifiables

1. Upload d'un PDF < 5 Mo depuis `/onboarding/upload-cv` → ligne `documents`
   créée en DB, le fichier est lisible dans Vercel Blob.
2. Upload d'un non-PDF ou > 5 Mo → bloqué dans `onBeforeGenerateToken`
   (erreur 400, pas de ligne créée).
3. Le middleware `cv-required` laisse passer vers `/dashboard` après upload.
4. Le dashboard affiche le CV (version, statut pending).
5. Re-upload incrémente `version`, reset `parsedAt = null`, émet un nouvel
   event `parse-cv`.
6. L'event `parse-cv` est visible dans le dashboard Inngest dev (handler no-op
   acceptable en F3).
7. Suppression compte : le job `delete-user-cascade` supprime le user, les
   `documents`, et déclenche `storageProvider.delete()` sur chaque blobUrl.
   Vérifier que le fichier n'est plus dans Blob.

## 5. Sortie obligatoire

- Quality gate complet :
  ```bash
  npx nuxt typecheck && npx eslint . && npx vitest run && npx nuxt build
  ```
- **`/review`** obligatoire.
- **`/imprint`** (CvUpload + composants shadcn Progress/AlertDialog).
- **`/remember save`**.
- Branch git : `F3-upload-cv`.
