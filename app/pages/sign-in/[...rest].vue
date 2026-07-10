<script setup lang="ts">
// Écran de connexion — wrapper du composant Clerk <SignIn /> dans le layout auth.
// Le composant est auto-importé par @clerk/nuxt (doc vérifiée 2026-07-10).
// afterSignInUrl configuré dans nuxt.config → /onboarding.
//
// ⚠️ Catch-all optionnel [[...rest]] (fix SSO callback) : le composant <SignIn />
// utilise des sous-routes internes (sso-callback, factor-two, reset-password...).
// Une route exacte sign-in.vue renvoyait 404 sur /sign-in/sso-callback après
// OAuth. Le catch-all optionnel matche /sign-in ET /sign-in/<sous-route>.
// Doc : clerk.com/docs/nuxt/guides/development/custom-sign-in-or-up-page
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
