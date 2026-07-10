<script setup lang="ts">
// Onboarding — upload CV (F3, remplace le placeholder F2).
// CvUpload émet `uploaded` → on rafraîchit le profil (hasCv devient true) puis
// on redirige vers /dashboard (le middleware cv-required est désormais satisfait).
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

useHead({ title: 'Importer votre CV — Postulr' })

const { refresh, hasCv } = useCurrentUser()

async function onUploaded() {
  // onUploadCompleted (webhook Blob) persiste hasCv=true côté serveur. On refresh
  // le profil pour que le middleware cv-required laisse passer vers /dashboard.
  // ⚠️ Il peut y avoir un court délai (webhook async) ; on retry une fois.
  try {
    await refresh()
    if (!hasCv.value) {
      // Le webhook n'est peut-être pas encore arrivé : on attend puis retry.
      await new Promise((r) => setTimeout(r, 1500))
      await refresh()
    }
  } catch {
    // refresh peut échouer transitoirement ; on redirige quand même, le
    // middleware réévaluera.
  }

  if (hasCv.value) {
    toast.success('Redirection vers votre tableau de bord…')
    await navigateTo('/dashboard')
  } else {
    // Le webhook tarde — on informe l'utilisateur sans bloquer.
    toast.info('CV importé. Finalisation en cours, patientez quelques secondes puis rechargez.')
  }
}
</script>

<template>
  <section class="mx-auto max-w-lg px-6 py-16">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold tracking-tight">
        Importez votre CV
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Votre CV sera analysé pour pré-remplir votre profil candidat.
      </p>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-4 py-8">
        <CvUpload @uploaded="onUploaded" />
        <p class="text-center text-xs text-muted-foreground">
          Vos données restent privées. Vous pouvez les supprimer à tout moment.
        </p>
      </CardContent>
    </Card>
  </section>
</template>
