<script setup lang="ts">
// Layout par défaut : header avec auth Clerk (F2) + slot.
// `<SignedOut>` / `<SignedIn>` = API Nuxt documentée (doc Clerk vérifiée 2026-07-10 —
// `<Show when=...>` est une primitive Next.js, inexistante en Nuxt).
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
          <SignedOut>
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
          </SignedOut>
          <!-- Connecté : menu utilisateur (logout natif) -->
          <SignedIn>
            <UserButton />
          </SignedIn>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>
