<script setup lang="ts">
// Layout par défaut : header minimal + slot.
// La nav sera enrichie feature par feature (auth en F2, dashboard en F6...).
</script>

<template>
  <div class="min-h-svh bg-background text-foreground">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight">
          Postulr
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm text-muted-foreground">
          <span class="hidden sm:inline">Aide</span>
          <span class="hidden sm:inline">Tarifs</span>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>
