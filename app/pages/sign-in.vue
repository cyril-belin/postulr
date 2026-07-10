<script setup lang="ts">
// Écran de connexion — wrapper du composant Clerk <SignIn /> dans le layout auth.
// Le composant est auto-importé par @clerk/nuxt (doc vérifiée 2026-07-10).
// afterSignInUrl configuré dans nuxt.config → /onboarding.
definePageMeta({ layout: 'auth' })

useHead({ title: 'Connexion — Postulr' })
</script>

<template>
  <div class="flex flex-col items-center gap-6">
    <h1 class="text-2xl font-semibold tracking-tight">
      Connexion
    </h1>
    <SignIn />
  </div>
</template>
