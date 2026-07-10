<script setup lang="ts">
// Placeholder upload CV (F2). Le vrai upload arrive en F3 (Vercel Blob direct).
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

useHead({ title: 'Importer votre CV — Postulr' })
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
      <CardContent class="flex flex-col items-center gap-4 py-10 text-center">
        <p class="text-sm text-muted-foreground">
          Le système d'import de CV arrive bientôt.
        </p>
        <Button disabled>
          Importer un CV (bientôt disponible)
        </Button>
      </CardContent>
    </Card>
  </section>
</template>
