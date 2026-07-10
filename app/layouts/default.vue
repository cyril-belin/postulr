<script setup lang="ts">
// Layout par défaut : header avec auth Clerk (F2) + slot.
// `<Show when="signed-in">` / `<Show when="signed-out">` = primitive Clerk/Vue
// vérifiée 2026-07-10 (inspection directe de @clerk/vue). ATTENTION :
// `SignedIn`/`SignedOut` N'EXISTENT PAS en Clerk/Vue (c'est Clerk/React) —
// seule `<Show>` est disponible, avec `when` + slot `#fallback`.
// Le logout passe par le UserButton Clerk (natif).
</script>

<template>
  <div class="min-h-svh bg-background text-foreground">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight">
          Postulr
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm text-muted-foreground">
          <!-- Non connecté : boutons de connexion/inscription -->
          <Show when="signed-out">
            <SignInButton as-child>
              <Button variant="ghost" size="sm">
                Se connecter
              </Button>
            </SignInButton>
            <SignUpButton as-child>
              <Button size="sm">
                Commencer
              </Button>
            </SignUpButton>
          </Show>
          <!-- Connecté : menu utilisateur (logout natif) -->
          <Show when="signed-in">
            <UserButton />
          </Show>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>
