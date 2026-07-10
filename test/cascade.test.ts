import { describe, expect, it, vi } from 'vitest'
import { deleteBlobsBestEffort } from '#server/utils/cv-upload'

/**
 * Tests de la logique de suppression des blobs CV (F3 §5, critère #6).
 *
 * Règle F3 : tests = code réel. `deleteBlobsBestEffort` est la fonction de
 * production utilisée par le job `delete-user-cascade` (step 'delete-cv-blobs')
 * pour libérer les blobs Blob AVANT le hard-delete user.
 *
 * Propriété critique (RGPD) : un blob déjà supprimé ne doit pas faire échouer
 * la cascade — le droit à l'oubli exige de compléter (user + données DB) même
 * si un blob est absent.
 */

describe('deleteBlobsBestEffort — suppression cascade des blobs', () => {
  it('appelle deleter pour chaque blobUrl', async () => {
    const deleter = vi.fn().mockResolvedValue(undefined)
    const urls = ['blob://1', 'blob://2', 'blob://3']
    const result = await deleteBlobsBestEffort(urls, deleter)

    expect(deleter).toHaveBeenCalledTimes(3)
    expect(deleter).toHaveBeenCalledWith('blob://1')
    expect(deleter).toHaveBeenCalledWith('blob://2')
    expect(deleter).toHaveBeenCalledWith('blob://3')
    expect(result.deletedCount).toBe(3)
    expect(result.failures).toEqual([])
  })

  it('ne lève pas si un blob est déjà supprimé (best-effort)', async () => {
    const deleter = vi.fn((url: string) =>
      url === 'blob://missing' ? Promise.reject(new Error('BlobNotFound')) : Promise.resolve(),
    )
    const urls = ['blob://ok', 'blob://missing', 'blob://ok2']
    const result = await deleteBlobsBestEffort(urls, deleter)

    expect(result.deletedCount).toBe(2)
    expect(result.failures).toEqual(['blob://missing'])
  })

  it('gère une liste vide (aucun blob à supprimer)', async () => {
    const deleter = vi.fn()
    const result = await deleteBlobsBestEffort([], deleter)

    expect(deleter).not.toHaveBeenCalled()
    expect(result.deletedCount).toBe(0)
    expect(result.failures).toEqual([])
  })

  it('gère le cas où tous les blobs échouent (cascade DB continue quand même)', async () => {
    const deleter = vi.fn().mockRejectedValue(new Error('network'))
    const urls = ['blob://1', 'blob://2']
    const result = await deleteBlobsBestEffort(urls, deleter)

    expect(result.deletedCount).toBe(0)
    expect(result.failures).toEqual(['blob://1', 'blob://2'])
  })
})
