<script setup lang="ts">
// Landing minimaliste F1. Le lien /dashboard sera fonctionnel en F2 (auth).
</script>

<template>
  <section class="mx-auto max-w-3xl px-6 py-24 text-center">
    <p class="mb-4 text-sm font-medium text-muted-foreground">
      Candidatures simplifiées
    </p>
    <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
      Postulez mieux, pas plus.
    </h1>
    <p class="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
      Postulr agrège les offres, génère vos lettres et réponses sur mesure,
      et suit chaque candidature — de l'envoi à l'entretien.
    </p>
    <div class="mt-8 flex items-center justify-center gap-3">
      <Button as-child size="lg">
        <NuxtLink to="/dashboard">Commencer</NuxtLink>
      </Button>
    </div>
    <p class="mt-4 text-xs text-muted-foreground">
      Gratuit pour commencer. 5 packs de candidature par mois.
    </p>
  </section>
</template>
