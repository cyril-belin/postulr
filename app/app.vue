<script setup lang="ts">
// Root component. Sonner (toasts) monté globalement pour feedback onboarding.
useHead({
  htmlAttrs: { lang: 'fr' },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Sonner />
</template>
