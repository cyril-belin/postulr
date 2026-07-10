<script setup lang="ts">
// Onboarding RGPD — consentements (F2 §2, SCOPING §3.6).
// cv_processing + data_transfer_eu = requis ; marketing = optionnel.
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

useHead({ title: 'Bienvenue — Postulr' })

const cvProcessing = ref(false)
const dataTransferEu = ref(false)
const marketing = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)

async function submit() {
  // Garde côté client (le serveur valide aussi, mais on donne un feedback immédiat).
  if (!cvProcessing.value || !dataTransferEu.value) {
    error.value = 'Vous devez accepter le traitement de votre CV et le transfert hors-UE pour continuer.'
    return
  }
  error.value = null
  submitting.value = true
  try {
    await $fetch('/api/onboarding/consents', {
      method: 'POST',
      body: {
        cvProcessing: cvProcessing.value,
        dataTransferEu: dataTransferEu.value,
        marketing: marketing.value,
      },
    })
    toast.success('Consentements enregistrés.')
    // Redirection vers l'upload CV (F3).
    await navigateTo('/onboarding/upload-cv')
  } catch (e: unknown) {
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage
    error.value = msg ?? 'Une erreur est survenue. Réessayez.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-lg px-6 py-16">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold tracking-tight">
        Bienvenue sur Postulr
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Avant de commencer, nous devons recueillir votre consentement pour le traitement de vos données.
      </p>
    </div>

    <Card>
      <CardContent class="flex flex-col gap-5">
        <!-- cv_processing (requis) -->
        <label class="flex items-start gap-3 text-sm" for="consent-cv">
          <Checkbox id="consent-cv" v-model="cvProcessing" class="mt-0.5" />
          <span>
            <span class="font-medium">Traitement de mon CV</span>
            <span class="text-destructive"> *</span><br>
            <span class="text-muted-foreground">J'accepte que Postulr analyse mon CV pour remplir mon profil candidat.</span>
          </span>
        </label>

        <!-- data_transfer_eu (requis) -->
        <label class="flex items-start gap-3 text-sm" for="consent-eu">
          <Checkbox id="consent-eu" v-model="dataTransferEu" class="mt-0.5" />
          <span>
            <span class="font-medium">Transfert hors-UE</span>
            <span class="text-destructive"> *</span><br>
            <span class="text-muted-foreground">L'IA qui traite mes données est hébergée aux États-Unis (OpenAI). J'accepte ce transfert.</span>
          </span>
        </label>

        <!-- marketing (optionnel) -->
        <label class="flex items-start gap-3 text-sm" for="consent-mkt">
          <Checkbox id="consent-mkt" v-model="marketing" class="mt-0.5" />
          <span>
            <span class="font-medium">Communications produit</span><br>
            <span class="text-muted-foreground">Recevoir occasionnellement des conseils et nouveautés par email. (optionnel)</span>
          </span>
        </label>

        <p v-if="error" class="text-sm text-destructive">
          {{ error }}
        </p>
      </CardContent>
      <CardFooter class="justify-end gap-2">
        <Button :disabled="submitting" @click="submit">
          <span v-if="submitting">Enregistrement…</span>
          <span v-else>Continuer</span>
        </Button>
      </CardFooter>
    </Card>
  </section>
</template>
