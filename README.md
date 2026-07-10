# Postulr

Assistant à la candidature d'emploi pour le marché français. Voir
[`SCOPING.md`](./SCOPING.md) pour le cadrage produit et [`AGENTS.md`](./AGENTS.md)
pour les conventions techniques.

## Démarrage

```bash
npm install
cp .env.example .env   # renseigner les clés (DB, Clerk, OpenAI, ...)
npm run db:migrate      # appliquer les migrations Neon
npm run dev             # http://localhost:3000
```

## Configuration Clerk Dashboard (F2 — à faire manuellement)

L'authentification repose sur [`@clerk/nuxt`](https://clerk.com/docs/nuxt). Les
clés (`NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `NUXT_CLERK_SECRET_KEY`) sont dans
`.env`. La configuration côté **Dashboard Clerk** doit être faite à la main :

### 1. Providers d'authentification

Dans **User & Authentication → Email, Phone, Username** et **Social
Connections**, activer :

- **Email address** (avec mot de passe ou code)
- **Google** (OAuth)

### 2. URLs de redirection

Les redirections post-auth sont configurées dans `nuxt.config.ts` (bloc
`clerk`) : `signInUrl`, `signUpUrl`, et `signInFallbackRedirectUrl` /
`signUpFallbackRedirectUrl` pointent vers `/onboarding`. Vérifier dans le
Dashboard ( **Paths** ) que ces valeurs ne sont pas surchargées.

### 3. Webhook de synchronisation (CRITIQUE)

Les events Clerk (`user.created`, `user.updated`, `user.deleted`) synchronisent
la base Postulr via un webhook signé Svix.

- **Endpoint** : `https://postulr.online/api/clerk/webhook`
  (en dev local, utiliser un tunnel — ex. `ngrok` ou le forwarding Clerk).
- **Signing secret** : récupérer `NUXT_CLERK_WEBHOOK_SECRET` dans le Dashboard
  et le poser dans `.env`.
- **Events à souscrire** :
  - `user.created`
  - `user.updated`
  - `user.deleted`

⚠️ Le webhook vérifie la signature Svix (401 si invalide). Sans webhook
configuré, les utilisateurs Clerk ne sont pas créés en base.

### 4. Variables d'environnement

Voir [`.env.example`](./.env.example) pour la liste complète. Pour Clerk :

```
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NUXT_CLERK_SECRET_KEY=sk_test_...
NUXT_CLERK_WEBHOOK_SECRET=whsec_...
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Serveur de dev |
| `npm run build` | Build prod |
| `npm run typecheck` | Vérif types TS (vue-tsc) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run db:generate` | Générer une migration Drizzle |
| `npm run db:migrate` | Appliquer les migrations |

## Configuration Vercel Blob (F3 — upload CV)

Le stockage des CV utilise [Vercel Blob](https://vercel.com/docs/vercel-blob) en
**accès privé** (décision SCOPING §3.2 : les CV sont des PII sensibles, posture
RGPD-strict). Le `BLOB_READ_WRITE_TOKEN` est dans `.env`.

- Le store Blob doit être **privé** (souvent Vercel Pro). Les lectures passent
  par des URLs signées à courte durée délivrées par `GET /api/cv/download`.
- L'upload est **direct navigateur → Blob** (`@vercel/blob/client`), orchestré
  par `POST /api/cv/upload` (`handleUpload` + `onBeforeGenerateToken`/`onUploadCompleted`).

### Dev local — webhook `onUploadCompleted` (tunnel requis)

⚠️ **Critique** : `onUploadCompleted` (qui persiste le CV en base + pose
`hasCv=true` + déclenche le parsing) est un **webhook appelé par les serveurs
Vercel**. Il ne peut PAS atteindre `localhost` directement. Sans tunnel,
l'upload aboutit côté Blob mais **aucune ligne `documents` n'est créée** et
`hasCv` reste `false`.

Procédure :

```bash
# 1. Lancer un tunnel vers localhost:3000
ngrok http 3000   # ou cloudflared, voir alternatives Vercel Blob

# 2. Récupérer l'URL HTTPS (ex. https://abc.ngrok.app)

# 3. Configurer Vercel Blob pour utiliser cette URL comme callback.
#    Via la variable d'environnement (au boot du serveur Nuxt) :
#    VERCEL_BLOB_CALLBACK_URL=https://abc.ngrok.app/api/cv/upload
#    (Blob l'utilise comme base pour le callback onUploadCompleted)
```

Vérifier dans l'[onglet Blob du dashboard Vercel](https://vercel.com/dashboard)
que le callback est bien reçu après un upload de test.

### Variables d'environnement

```
NUXT_BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```
