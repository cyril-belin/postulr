<script setup lang="ts">
import { upload } from '@vercel/blob/client'
import { Loader2, Upload } from '@lucide/vue'
import { toast } from 'vue-sonner'

/**
 * CvUpload — zone de drop + bouton pour uploader un CV (PDF) vers Vercel Blob
 * via upload direct navigateur (AGENTS.md §5.2, décision SCOPING §3.2 : PRIVÉ).
 *
 * Utilise `upload()` de `@vercel/blob/client` avec `handleUploadUrl: '/api/cv/upload'`.
 * Le serveur orchestre (token + onUploadCompleted), ne reçoit jamais le binaire.
 *
 * États : idle / uploading (progress %) / success / error. Allowlist `.pdf` côté
 * UI (le contrôle de sécurité réel est côté serveur — onBeforeGenerateToken via
 * allowedContentTypes appliqué par Blob).
 *
 * Émet `uploaded` en succès (le parent rafraîchit profil/liste + redirige).
 */

const emit = defineEmits<{
  uploaded: []
}>()

// --- État ---
const isDragging = ref(false)
const isUploading = ref(false)
const progress = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)

// --- Handlers ---

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) await handleUpload(file)
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) void handleUpload(file)
  // reset pour permettre le re-upload du même fichier (sinon change ne fire pas)
  target.value = ''
}

function pickFile() {
  fileInput.value?.click()
}

// --- Validation UI (le contrôle réel reste côté serveur) ---
function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

// --- Upload ---
async function handleUpload(file: File) {
  // Garde UI : PDF uniquement + 5 Mo max. Le serveur re-vérifie (Blob applique
  // allowedContentTypes/maximumSizeInBytes) — cette garde est pour le feedback
  // immédiat, pas la sécurité.
  if (!isPdf(file)) {
    toast.error('Seuls les fichiers PDF sont acceptés.')
    return
  }
  const MAX = 5 * 1024 * 1024
  if (file.size > MAX) {
    toast.error('Le CV dépasse la taille maximale de 5 Mo.')
    return
  }

  isUploading.value = true
  progress.value = 0

  try {
    await upload(`cv/${file.name}`, file, {
      access: 'private',
      handleUploadUrl: '/api/cv/upload',
      contentType: 'application/pdf',
      onUploadProgress: (p) => {
        progress.value = p.percentage
      },
    })

    toast.success('CV importé avec succès.')
    emit('uploaded')
  } catch (err) {
    console.error('[CvUpload] upload error', err)
    toast.error("Erreur lors de l'import du CV. Réessayez.")
  } finally {
    isUploading.value = false
    progress.value = 0
  }
}
</script>

<template>
  <div class="w-full">
    <input
      ref="fileInput"
      type="file"
      accept="application/pdf"
      class="hidden"
      @change="onFileSelect"
    >

    <!-- Zone de drop / bouton -->
    <div
      role="button"
      tabindex="0"
      :class="[
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
        'cursor-pointer hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging ? 'border-primary bg-accent' : 'border-border',
        isUploading ? 'pointer-events-none opacity-60' : '',
      ]"
      @click="pickFile"
      @keydown.enter.prevent="pickFile"
      @keydown.space.prevent="pickFile"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div class="flex flex-col items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-full bg-muted">
          <Upload v-if="!isUploading" class="size-5 text-muted-foreground" />
          <Loader2 v-else class="size-5 animate-spin text-muted-foreground" />
        </div>
        <p class="text-sm font-medium">
          {{ isUploading ? 'Import en cours…' : 'Glissez votre CV ici ou cliquez pour parcourir' }}
        </p>
        <p class="text-xs text-muted-foreground">
          PDF uniquement, 5 Mo max.
        </p>
      </div>
    </div>

    <!-- Barre de progression -->
    <div v-if="isUploading" class="mt-3 flex items-center gap-2">
      <Progress :model-value="progress" class="h-1" />
      <span class="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {{ progress }}%
      </span>
    </div>
  </div>
</template>
