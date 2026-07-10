<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

function handleHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <NuxtLayout>
    <div class="flex min-h-svh items-center justify-center p-6">
      <Card class="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle class="text-2xl">{{ error.statusCode }}</CardTitle>
          <CardDescription>
            {{ error.statusMessage || 'Une erreur est survenue.' }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">
            Désolé, quelque chose s'est mal passé.
          </p>
        </CardContent>
        <CardFooter class="justify-center">
          <Button @click="handleHome">
            Retour à l'accueil
          </Button>
        </CardFooter>
      </Card>
    </div>
  </NuxtLayout>
</template>
