<script setup lang="ts">
// Écran d'inscription — wrapper du composant Clerk <SignUp /> dans le layout auth.
// afterSignUpUrl configuré dans nuxt.config → /onboarding.
//
// ⚠️ Catch-all optionnel [[...rest]] (fix SSO callback) : le composant <SignUp />
// utilise des sous-routes internes (sso-callback, verify...). Une route exacte
// sign-up.vue renvoyait 404 sur /sign-up/sso-callback après OAuth. Le catch-all
// optionnel matche /sign-up ET /sign-up/<sous-route>.
// Doc : clerk.com/docs/nuxt/guides/development/custom-sign-in-or-up-page
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
