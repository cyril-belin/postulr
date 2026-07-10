<script setup lang="ts">
// Dashboard placeholder (F2). Sera enrichi feature par feature (job board F6,
// applications F7...). Protégé par auth + cv-required.
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'cv-required'],
})

useHead({ title: 'Tableau de bord — Postulr' })

const { email, hasCv } = useCurrentUser()
const deleting = ref(false)

async function deleteAccount() {
  if (!confirm('Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.')) {
    return
  }
  deleting.value = true
  try {
    await $fetch('/api/account/delete', { method: 'POST' })
    // La cascade hard-delete l'utilisateur → la session Clerk est invalide.
    // On redirige vers l'accueil ; Clerk orientera vers sign-in.
    await navigateTo('/')
  } catch {
    const { toast } = await import('vue-sonner')
    toast.error('Erreur lors de la suppression. Réessayez.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl px-6 py-16">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight">
        Tableau de bord
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Bienvenue{{ email ? `, ${email}` : '' }}.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>État du compte</CardTitle>
        <CardDescription>Votre profil et votre CV.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">CV importé</span>
          <span :class="hasCv ? 'text-foreground' : 'text-muted-foreground'">
            {{ hasCv ? 'Oui' : 'Non' }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Formule</span>
          <span>Gratuit</span>
        </div>
      </CardContent>
      <CardFooter class="justify-between">
        <span class="text-xs text-muted-foreground">Vos données vous appartiennent.</span>
        <Button variant="destructive" :disabled="deleting" @click="deleteAccount">
          {{ deleting ? 'Suppression…' : 'Supprimer mon compte' }}
        </Button>
      </CardFooter>
    </Card>
  </section>
</template>
