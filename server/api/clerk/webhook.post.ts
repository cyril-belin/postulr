import { Webhook } from 'svix'
import { users } from '#server/schema/users'

/**
 * Webhook Clerk (F2 §2) — signature Svix vérifiée obligatoirement.
 *
 * Events souscrits (Dashboard Clerk) : user.created, user.updated, user.deleted.
 * Doc Svix vérifiée 2026-07-10 : `Webhook.verify` exige le **raw body** (d'où
 * `readRawBody(event)` et non `readBody`, qui parserait le JSON et casserait la
 * signature). Signature invalide → 401, aucune écriture en base.
 *
 * `event.context.auth()` n'est PAS utilisé ici : les webhooks Clerk sont
 * authentifiés par signature Svix, pas par session Clerk (le serveur Clerk n'a
 * pas de session). Le secret vient de `NUXT_CLERK_WEBHOOK_SECRET`
 * (runtimeConfig — jamais `process.env` direct, AGENTS §5.1).
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // 1. Lire le raw body (requis pour Svix).
  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Empty body' })
  }

  // 2. Headers Svix — requis pour la vérif. Manquants → 401.
  const svixId = getRequestHeader(event, 'svix-id')
  const svixTimestamp = getRequestHeader(event, 'svix-timestamp')
  const svixSignature = getRequestHeader(event, 'svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Svix headers' })
  }

  // 3. Vérifier la signature. `new Webhook(secret)` puis `.verify()`.
  let payload: ClerkWebhookEvent
  try {
    const wh = new Webhook(config.clerkWebhookSecret)
    payload = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    // Signature invalide → 401, on ne touche pas à la base.
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
  }

  // 4. Router selon le type d'event.
  const db = getDb()
  const data = payload.data

  if (payload.type === 'user.created' || payload.type === 'user.updated') {
    // Upsert : id = Clerk userId, email = primary email, plan = 'free' par défaut
    // (on ne réinitialise pas le plan sur un update — il est géré par Clerk Billing en F10).
    const email = data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address
      ?? data.email_addresses[0]?.email_address
    if (!email) {
      throw createError({ statusCode: 400, statusMessage: 'No email on user' })
    }
    await db
      .insert(users)
      .values({
        id: data.id,
        email,
        plan: 'free',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { email }, // on ne touuche PAS à plan/hasCv sur update
      })
    return { received: true }
  }

  if (payload.type === 'user.deleted') {
    // RGPD droit à l'oubli (SCOPING §3.6) — job Inngest en cascade.
    // F2 : squelette (delete users + consents seulement ; CV Blob en F3,
    // applications en F7). On déclenche le job + on hard-delete user
    // (le cascade FK supprime les consents).
    const userId = data.id
    if (userId) {
      await getInngest().send({
        name: 'delete-user-cascade',
        data: { userId },
      })
    }
    return { received: true }
  }

  // Event non géré → 200 (on accuse réception pour éviter les retries Clerk).
  return { received: true, ignored: payload.type }
})

// --- Types webhook Clerk (non exportés par @clerk/nuxt, on les définit ici) ---

interface ClerkEmailAddress {
  id: string
  email_address: string
}

interface ClerkUserData {
  id: string
  email_addresses: ClerkEmailAddress[]
  primary_email_address_id: string | null
  deleted?: boolean
}

type ClerkWebhookEvent =
  | { type: 'user.created' | 'user.updated'; data: ClerkUserData }
  | { type: 'user.deleted'; data: ClerkUserData }
  | { type: string; data: ClerkUserData }
