<script setup lang="ts">
import { Clock, Download, FileText } from '@lucide/vue'
import { toast } from 'vue-sonner'

// Dashboard (F2 squelette + F3 section « Mes CV »). Protégé par auth + cv-required.
// Sera enrichi feature par feature (job board F6, applications F7...).
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'cv-required'],
})

useHead({ title: 'Tableau de bord — Postulr' })

const { email, hasCv, refresh } = useCurrentUser()
const deleting = ref(false)
const reuploadOpen = ref(false)
// Révéler la zone d'upload après confirmation de remplacement (si un CV existe).
const showReplaceUpload = ref(false)

// --- Liste des CV ---
interface CvDocument {
  id: string
  version: number
  status: 'parsed' | 'pending'
  createdAt: string
}

const { data: cvData, refresh: refreshCvs } = useFetch<{ documents: CvDocument[] }>('/api/cv', {
  key: 'cv-list',
  default: () => ({ documents: [] }),
})

const documents = computed(() => cvData.value?.documents ?? [])
const latestVersion = computed(() => documents.value[0]?.version ?? null)

// --- Upload succès → rafraîchir profil + liste ---
async function onUploaded() {
  await refresh()
  await refreshCvs()
  reuploadOpen.value = false
  showReplaceUpload.value = false
}

// Confirmer le remplacement → révéler la zone d'upload.
function confirmReplace() {
  reuploadOpen.value = false
  showReplaceUpload.value = true
}

// --- Téléchargement via URL signée (Blob privé — SCOPING §3.2) ---
async function downloadCv() {
  try {
    const { url } = await $fetch<{ url: string }>('/api/cv/download')
    // Ouvre l'URL signée (courte durée) dans un nouvel onglet → téléchargement.
    window.open(url, '_blank')
  } catch {
    toast.error('Impossible de récupérer le CV. Réessayez.')
  }
}

// --- Formatage date ---
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- Suppression de compte (F2, inchangé) ---
async function deleteAccount() {
  if (!confirm('Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.')) {
    return
  }
  deleting.value = true
  try {
    await $fetch('/api/account/delete', { method: 'POST' })
    await navigateTo('/')
  } catch {
    toast.error('Erreur lors de la suppression. Réessayez.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl px-6 py-16">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight">
        Tableau de bord
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Bienvenue{{ email ? `, ${email}` : '' }}.
      </p>
    </div>

    <!-- Section Mes CV (F3) -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>Mes CV</CardTitle>
        <CardDescription>
          Vos versions de CV importées. La plus récente sert de référence.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <!-- Aucun CV (ne devrait pas arriver : cv-required gating) -->
        <div v-if="documents.length === 0" class="text-sm text-muted-foreground">
          Aucun CV importé.
        </div>

        <!-- Liste des versions -->
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="doc in documents"
            :key="doc.id"
            class="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-md bg-muted">
                <FileText class="size-4 text-muted-foreground" />
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium">CV — v{{ doc.version }}</span>
                <span class="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock class="size-3" />
                  {{ formatDate(doc.createdAt) }}
                </span>
              </div>
            </div>
            <span
              :class="[
                'rounded-full px-2 py-0.5 text-xs font-medium',
                doc.status === 'parsed'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground',
              ]"
            >
              {{ doc.status === 'parsed' ? 'Analysé' : 'En attente' }}
            </span>
          </li>
        </ul>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <!-- Zone d'upload : toujours visible si pas de CV, ou après confirmation de remplacement -->
          <CvUpload
            v-if="!hasCv || showReplaceUpload"
            @uploaded="onUploaded"
          />

          <!-- Boutons secondaires -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Re-upload avec confirmation (si un CV existe déjà) -->
            <AlertDialog v-if="hasCv && !showReplaceUpload" v-model:open="reuploadOpen">
              <AlertDialogTrigger as-child>
                <Button variant="outline" size="sm">
                  Remplacer mon CV
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remplacer votre CV ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L'ancien CV restera dans votre historique. La nouvelle version
                    deviendra votre CV courant et sera analysée à nouveau.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction @click="confirmReplace">
                    Continuer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              v-if="latestVersion"
              variant="outline"
              size="sm"
              @click="downloadCv"
            >
              <Download class="mr-2 size-4" />
              Télécharger (v{{ latestVersion }})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- État du compte (F2) -->
    <Card>
      <CardHeader>
        <CardTitle>État du compte</CardTitle>
        <CardDescription>Votre profil et votre formule.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">CV importé</span>
          <span :class="hasCv ? 'text-foreground' : 'text-muted-foreground'">
            {{ hasCv ? 'Oui' : 'Non' }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Formule</span>
          <span>Gratuit</span>
        </div>
      </CardContent>
      <CardFooter class="justify-between">
        <span class="text-xs text-muted-foreground">Vos données vous appartiennent.</span>
        <Button variant="destructive" :disabled="deleting" @click="deleteAccount">
          {{ deleting ? 'Suppression…' : 'Supprimer mon compte' }}
        </Button>
      </CardFooter>
    </Card>
  </section>
</template>
