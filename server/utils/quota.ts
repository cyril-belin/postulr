/**
 * Quota — STUB F3 (AGENTS.md §2, prompt F3).
 *
 * ⚠️ CONTRAT STABLE : l'INTERFACE de ce module ne changera pas. F10 remplacera
 * le CORPS (fenêtre glissante 30j, limites free/pro) SANS modifier les
 * signatures → aucun code appelant à mettre à jour. Ne pas changer les noms,
 * les params ou le type de retour sans coordonner avec F10.
 *
 * Features concernées : 'cv_parse' (F3/F4), 'pack' (F7), 'auto_apply' (F9).
 */

export type QuotaFeature = 'cv_parse' | 'pack' | 'auto_apply'

export interface QuotaCheckResult {
  allowed: boolean
  /** Raison du refus éventuel (i18n côté UI, pas hardcodé ici en F10). */
  reason?: string
}

/**
 * Vérifie si l'utilisateur peut consommer une unité de la feature donnée.
 *
 * STUB F3 : always-allow. F10 : compte les consommations sur 30j glissants,
 * compare au plafond du plan (free < pro), renvoie `{ allowed: false }` si
 * dépassé.
 */
export async function checkQuota(_userId: string, _feature: QuotaFeature): Promise<QuotaCheckResult> {
  return { allowed: true }
}

/**
 * Décrémente le compteur de quota après une consommation réussie.
 *
 * STUB F3 : no-op. F10 : insère une ligne de consommation datée (table à venir)
 * pour le comptage glissant.
 */
export async function decrementQuota(_userId: string, _feature: QuotaFeature): Promise<void> {
  // no-op (F10)
}
