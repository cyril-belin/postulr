/**
 * Healthcheck de fumée (Vercel). Valide que le serveur répond.
 *
 * ⚠️ Ne expose PLUS `userCount` (F2 — TODO F1 résolu) : la route est publique
 * et un compteur d'utilisateurs ne doit pas fuiter. Une future route admin
 * (hors périmètre V1) pourra exposer des métriques derrière auth.
 */
export default defineEventHandler(() => {
  return { ok: true }
})
