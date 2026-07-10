# Memory — F3 Upload CV + storage Vercel Blob

Last updated: 2026-07-10

## What was built

F3 (Upload CV + storage Vercel Blob PRIVÉ) terminée, **quality gate full vert**
(typecheck ✓, eslint ✓ 0 warning, vitest 32/32 ✓, build ✓), **`/review` passé**
(review : 6 issues, #4 idempotence webhook corrigée + #1 clarification throw).
Branche `F3-upload-cv` **pushée, PR #2 ouverte vers main — ne pas merger,
part en review externe**.

Fichiers créés / modifiés :
- `server/schema/documents.ts` (table documents, kind='CV', blobUrl UNIQUE)
- `server/utils/storage/` (types.ts, vercel-blob.ts, index.ts — abstraction)
- `server/utils/quota.ts` (stub, interface stable pour F10)
- `server/utils/cv-upload.ts` (validateUploadRequest, nextVersion, deleteBlobsBestEffort)
- `server/utils/webhook-guard.ts` (extraction backlog F2 #2)
- `app/utils/cv-redirect.ts` (extraction backlog F2 #2)
- `server/api/cv/upload.post.ts` (handleUpload), `download.get.ts` (URL signée),
  `index.get.ts` (liste versions)
- `server/jobs/parse-cv.ts` (stub F4) + `delete-user-cascade.ts` étendu (delete blobs)
- `app/components/cv/CvUpload.vue` (dropzone + progress + états)
- `app/pages/onboarding/upload-cv.vue` (réel, remplace placeholder F2)
- `app/pages/dashboard/index.vue` (section « Mes CV »)
- Primitives shadcn : Progress + AlertDialog (ajoutées via CLI)
- Migrations `db/0002_aromatic_warstar.sql` + `db/0003_strange_kingpin.sql`

## Decisions made (cette session)

- **Blob PRIVÉ + URLs signées courte durée** (SCOPING §3.2). Capacité confirmée
  doc officielle Vercel Blob 2026-07-10 : Private Blob est GA, lectures via
  `issueSignedToken` + `presignUrl(operation:'get')`. Le `blobUrl` brut n'est
  JAMAIS renvoyé au client (download délivre URL signée 60s). Prérequis : store
  Blob privé (souvent Vercel Pro) — à valider en intégration.
- **Consents APPEND-ONLY** (backlog F2 #1). PAS de contrainte unique
  (userId,type). Journal d'audit complet de l'historique des consentements
  (exigence RGPD). /api/me prend la ligne la plus récente par type.
- **`handleUpload` ↔ Nitro** : `handleUpload` est conçue pour Next (attend un
  Web Request). On adapte l'event H3 via `toWebRequest(event)`. Import depuis
  `@vercel/blob/client` (PAS `@vercel/blob`).
- **Idempotence `onUploadCompleted`** : check blobUrl existant + contrainte
  UNIQUE DB (le webhook Blob peut être réessayé → doublon sinon).
- **`tokenPayload`** : comment le userId passe de `onBeforeGenerateToken`
  (requête auth user, a `event.context.auth()`) à `onUploadCompleted` (webhook
  Blob, PAS de session Clerk). `JSON.stringify({userId})` posé dans tokenPayload,
  lu côté webhook.
- **`components.json` `"font": ""`** : pour empêcher `shadcn-vue add` de
  réinjecter l'import Google Fonts Geist (régression RGPD détectée+corrigée).

## Problems solved

- **Régression Geist RGPD** : `shadcn-vue add progress alert-dialog` a réinjecté
  `@import url('https://fonts.googleapis.com/...')` dans tailwind.css (le
  `components.json` `"font": "geist-sans"` le déclenche). Corrigé : import
  supprimé + `components.json` `"font": ""` pour prévenir la récidive.
- **Import dupliqué StorageProvider/StorageError** : Nitro auto-importe depuis
  types.ts ET index.ts → ne PAS ré-exporter depuis index.ts (warning typecheck).
- **handleUpload import path** : `@vercel/blob/client`, pas `@vercel/blob`.
- **TS narrowing après guard externe** : `validateUploadRequest` retourne ok/false
  mais TS ne narrow pas userId → assertion `userId!` après le guard.

## Current state

- **Quality gate FULL VERT.** typecheck ✓, eslint ✓ (0 warning), vitest 32/32 ✓,
  build ✓.
- **Graph régénéré** (`/graphify . --code-only`) : 380 nœuds, 383 edges,
  64 communities.
- **`/review` passé** (6 issues : #1 clarification throw intentional, #4
  idempotence webhook corrigée avec contrainte UNIQUE + check applicatif).
- **`/imprint` fait** : Progress (§3.7), AlertDialog (§3.8), CvUpload (§4.1)
  dans ui-registry.md.
- **PR #2 ouverte** (F3-upload-cv → main). Ne pas merger, review externe d'abord.

## Next session starts with

1. **`/remember restore`**.
2. **Attendre le retour de la review externe de PR #2** puis appliquer les
   corrections éventuelles + merger.
3. **⚠️ PRÉREQUIS F3 intégration (manuel, bloquant pour valider les critères
   d'acceptation #1/#4)** : configurer le store Vercel Blob **privé** (Vercel
   Pro), poser `NUXT_BLOB_READ_WRITE_TOKEN`, tunnel ngrok pour le webhook
   `onUploadCompleted`, tester un upload réel (PDF < 5Mo) → valider ligne
   documents + hasCv=true + event cv/uploaded dans Inngest dev server.
4. **Démarrer F4 (Parsing CV par IA)** → `prompts/F4-*.md`. Le stub `parse-cv`
  (server/jobs/parse-cv.ts) existe déjà et est registered. Premier sous-objectif :
  récupérer le PDF via URL signée, appeler LlmProvider (à créer en F4), valider
  sortie Zod, persister profil, poser `documents.parsedAt`.

## Open questions / TODO pour F4+

- **Store Blob privé** : à configurer côté Vercel (Pro ?) — `issueSignedToken`
  échoue si le store est public. Le code est correct quel que soit le mode
  (download restreint l'accès authentifié = défense en profondeur).
- **`handleUpload` ↔ Nitro** : `toWebRequest(event)` à confirmer au runtime
  (testé en build mais pas en intégration live — la route n'est pas testée
  end-to-end, juste la logique extraite).
- **Tests routes serveur = logique pure** (backlog persistant) : les routes
  /api/cv/* ne sont pas testées end-to-end ($fetch sur vraie route), juste les
  fonctions pures extraites. Couverture réelle route = faible. Inngest dev server
  + tunnel pour valider en intégration.
- **Quota stub** : F10 remplacera le corps (fenêtre glissante 30j, free/pro)
  SANS changer l'interface — aucun code appelant à modifier.
- **TODO F7** : anonymisation applications dans delete-user-cascade (count sans
  PII). TODO F4 : impl réelle de parse-cv.
- **Règle shadcn-vue** : après chaque `npx shadcn-vue add`, vérifier que
  tailwind.css n'a pas reçu d'import Google Fonts (régression Geist). Le
  `components.json "font": ""` devrait prévenir, mais à surveiller.
