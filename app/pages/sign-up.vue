<script setup lang="ts">
// Écran d'inscription — wrapper du composant Clerk <SignUp /> dans le layout auth.
// afterSignUpUrl configuré dans nuxt.config → /onboarding.
definePageMeta({ layout: 'auth' })

useHead({ title: 'Créer un compte — Postulr' })
</script>

<template>
  <div class="flex flex-col items-center gap-6">
    <h1 class="text-2xl font-semibold tracking-tight">
      Créer un compte
    </h1>
    <SignUp />
  </div>
</template>
