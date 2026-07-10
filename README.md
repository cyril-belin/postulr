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
