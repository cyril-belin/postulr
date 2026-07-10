# ui-registry.md — Registre UI Postulr

> **Registre vivant des composants UI** (AGENTS.md §6). Source de vérité unique
> pour "qu'est-ce qui existe déjà". À consulter **avant** de créer un composant.
> Mis à jour par le skill `/imprint` après chaque création/modification de
> composant UI.

---

## 1. Stack UI

- **shadcn-nuxt** (module Nuxt) + **shadcn-vue** (CLI) — base `reka-nova`,
  lib d'icônes **Lucide**, primitives **Reka UI** (successeur de Radix Vue).
- **Tailwind CSS v4** — config **CSS-first** (aucun `tailwind.config.ts`).
  Le design system vit dans `app/assets/css/tailwind.css`.
- **Police** : Geist Sans (chargée via Google Fonts dans le CSS).
- Tout composant métier va dans `app/components/<feature>/` et compose les
  primitives ci-dessous. **Interdiction d'inventer un composant hors registre**
  (AGENTS.md §4.1).
- Alias d'import : `@/components/ui`, `@/lib/utils`. La primitive `cn()` vit
  dans `app/lib/utils.ts`.
- Répertoire auto-importé par le module shadcn-nuxt : `~/components/ui`.

---

## 2. Design tokens

Format **Tailwind v4 CSS-first** : valeurs `oklch(...)` dans `:root` (light) et
`.dark` (dark mode via classe `.dark` sur `<html>`), exposées à Tailwind via la
directive `@theme inline` sous forme de `--color-*`.

> ⚠️ **Ne pas utiliser `hsl(var(--...))`** (pattern Tailwind v3 obsolète). Les
> tokens s'utilisent directement via les utilitaires Tailwind sémantiques :
> `bg-background`, `text-foreground`, `border-border`, `text-primary`, etc.

Base color : **neutral** (nuances grises pures, L variable).

| Token (utility) | `:root` (light) | `.dark` | Rôle |
|---|---|---|---|
| `background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Fond de page |
| `foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte par défaut |
| `card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Fond de carte |
| `card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte de carte |
| `popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Fond de popover/menu |
| `popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte popover |
| `primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | Action principale |
| `primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | Texte sur primary |
| `secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Action secondaire |
| `secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | Texte sur secondary |
| `muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Fond discret |
| `muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Texte discret |
| `accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Survol / sélection |
| `accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | Texte sur accent |
| `destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Erreur / suppression |
| `border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Bordures |
| `input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | Bordure de champ |
| `ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | Anneau de focus |

### Rayons (tokens `--radius-*`)

`--radius: 0.625rem` (défaut). Dérivés : `--radius-sm` (−4px), `--radius-md`
(−2px), `--radius-lg` (= radius), `--radius-xl` (+4px). Utiliser `rounded-md`,
`rounded-lg`, etc. — **jamais de rayon ad hoc** (AGENTS.md §4.2).

### Dark mode

Géré par la classe `.dark` sur `<html>` (convention shadcn). Les tokens ont une
variante dark automatique. Le toggle sera branché en F2 (color-mode).

---

## 3. Primitives installées (F1 + F2 + F3)

Huit primitives (Button, Card, Input, Label en F1 ; Checkbox, Sonner en F2 ;
Progress, AlertDialog en F3). Tout le reste du UI se compose à partir de
celles-ci + des primitives ajoutées feature par feature (chaque ajout via
`npx shadcn-vue add <name>`, jamais écrit à la main).

### 3.1 `Button`

`app/components/ui/button/` — exposable via `import { Button } from '@/components/ui/button'`
(auto-importé dans les `.vue`).

Variants (`variant`) : `default` (primary), `outline`, `secondary`, `ghost`,
`destructive`, `link`.

Sizes (`size`) : `default` (h-8), `xs`, `sm`, `lg`, `icon`, `icon-xs`,
`icon-sm`, `icon-lg`.

Props notables : `as` (défaut `button`), `as-child` (hérite de `PrimitiveProps`
Reka UI — passe le rendu à l'élément enfant, pratique pour wrapper un
`NuxtLink` tout en gardant le style bouton).

```vue
<Button>Default</Button>
<Button variant="outline" size="lg">Outline</Button>
<Button variant="destructive">Supprimer</Button>
<!-- Rendu en <a>/<NuxtLink> avec le style bouton : -->
<Button as-child>
  <NuxtLink to="/dashboard">Commencer</NuxtLink>
</Button>
```

### 3.2 `Card` (+ 6 sous-composants)

`app/components/ui/card/` — `Card`, `CardHeader`, `CardTitle`,
`CardDescription`, `CardAction`, `CardContent`, `CardFooter`.

Structure standard : `Card > [CardHeader (CardTitle, CardDescription, CardAction?)] > CardContent > CardFooter`.

Prop `size` sur `Card` : `default` | `sm`.

```vue
<Card class="max-w-md">
  <CardHeader>
    <CardTitle>Titre</CardTitle>
    <CardDescription>Sous-titre discret</CardDescription>
  </CardHeader>
  <CardContent>Corps de la carte.</CardContent>
  <CardFooter class="justify-end gap-2">
    <Button variant="outline">Annuler</Button>
    <Button>Confirmer</Button>
  </CardFooter>
</Card>
```

### 3.3 `Input`

`app/components/ui/input/` — `<Input v-model="value" />`. Hauteur h-8, bordure
`input`, focus `ring`. Gestion `modelValue` + `update:modelValue` (vueuse
`useVModel`, passive). Supporte `aria-invalid` (bordure/anneau `destructive`).

### 3.4 `Label`

`app/components/ui/label/` — `<Label for="x">Texte</Label>`. Hérite `LabelProps`
Reka UI (a11y native). Text-sm medium, gère l'état disabled du peer.

---

### 3.1.1 — Button (propriétés de cohérence)

File: `app/components/ui/button/Button.vue`
Last updated: 2026-07-10

| Property | Class |
| --- | --- |
| Background | `bg-primary` (default) / `bg-secondary` / `bg-background` (outline) / `bg-muted` (ghost hover) |
| Border | `border-transparent` (default) / `border-border` (outline) |
| Border radius | `rounded-lg` |
| Text — primary | `text-primary-foreground` (default) / `text-foreground` (outline/ghost) |
| Text size | `text-sm` |
| Text weight | `font-medium` |
| Spacing (default size) | `h-8 gap-1.5 px-2.5` |
| Hover | variant-specific (`hover:bg-muted`, `[a]:hover:bg-primary/80`, ...) |
| Focus | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3` |
| Active | `active:not-aria-[haspopup]:translate-y-px` |
| Shadow | none |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |

**Pattern notes :** Un seul rayon — `rounded-lg`. Focus toujours `ring-3` sur le token `ring`. Les boutons icône utilisent les sizes `icon*` (carré). `as-child` pour wrapper un `NuxtLink` en gardant le style. Ne pas override ces classes.

### 3.2.1 — Card (propriétés de cohérence)

File: `app/components/ui/card/Card.vue` (+ CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction)
Last updated: 2026-07-10

| Property | Class |
| --- | --- |
| Background | `bg-card` |
| Text | `text-card-foreground` (conteneur) / `text-sm` (base) |
| Border/ring | `ring-1 ring-foreground/10` (pas de `border-*`, c'est un ring) |
| Border radius | `rounded-xl` (carte) / `rounded-t-xl` (header avec image) |
| Spacing | `gap-4 py-4` (default) / `gap-3 py-3` (size=sm) ; header `px-4 gap-1` |
| Shadow | none |
| Accent usage | none par défaut |

**Pattern notes :** Les cartes utilisent un **ring** (`ring-foreground/10`), pas une bordure — à respecter pour toute surface "card-like". Rayon `rounded-xl`. Sous-composants : `CardHeader` (grid, `gap-1 px-4`), `CardTitle`, `CardDescription` (`text-muted-foreground`), `CardContent` (`px-4`), `CardFooter` (`px-4`, souvent `justify-end gap-2`). Prop `size` : `default` | `sm`.

### 3.3.1 — Input (propriétés de cohérence)

File: `app/components/ui/input/Input.vue`
Last updated: 2026-07-10

| Property | Class |
| --- | --- |
| Background | `bg-transparent` (`dark:bg-input/30`) |
| Border | `border-input` |
| Border radius | `rounded-lg` |
| Text | `text-base md:text-sm` ; `placeholder:text-muted-foreground` |
| Spacing | `h-8 px-2.5 py-1` |
| Focus | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3` |
| Invalid | `aria-invalid:border-destructive aria-invalid:ring-destructive/20` |
| Disabled | `disabled:bg-input/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50` |
| Width | `w-full min-w-0` |

**Pattern notes :** Hauteur `h-8` (alignée sur Button size default). Toujours `w-full min-w-0`. Focus `ring-3` cohérent avec Button. `modelValue` via `useVModel` (passive).

### 3.4.1 — Label (propriétés de cohérence)

File: `app/components/ui/label/Label.vue`
Last updated: 2026-07-10

| Property | Class |
| --- | --- |
| Text | `text-sm font-medium leading-none` |
| Layout | `flex items-center gap-2 select-none` |
| Disabled | `peer-disabled:opacity-50 group-data-[disabled=true]:opacity-50` |

**Pattern notes :** Reka UI `Label` (a11y native). Toujours `text-sm font-medium`. S'associe au peer (Input) pour l'état disabled.

### 3.5 — Checkbox (propriétés de cohérence)

File: `app/components/ui/checkbox/Checkbox.vue`
Last updated: 2026-07-10 (F2)

| Property | Class |
| --- | --- |
| Size | `size-4` (carré) |
| Border | `border-input` (unchecked) |
| Checked bg | `data-checked:bg-primary data-checked:border-primary` |
| Checked text | `data-checked:text-primary-foreground` |
| Border radius | `rounded-[4px]` (note : légèrement plus petit que `rounded-md`) |
| Focus | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3` |
| Invalid | `aria-invalid:border-destructive aria-invalid:ring-destructive/20` |
| Disabled | `disabled:cursor-not-allowed disabled:opacity-50` |
| Indicator icon | `size-3.5` (CheckIcon centré) |

**Pattern notes :** Reka UI `CheckboxRoot` (a11y native). `v-model` via `modelValue`/`update:modelValue`. Taille fixe `size-4`. Le focus `ring-3` est cohérent avec Button/Input. Utilisé dans l'onboarding pour les consentements RGPD, associé à un `<Label for=...>`.

### 3.6 — Sonner / Toaster (propriétés de cohérence)

File: `app/components/ui/sonner/Sonner.vue` (wrapper `vue-sonner` `Toaster`)
Last updated: 2026-07-10 (F2)

| Property | Value |
| --- | --- |
| Toast background | `var(--popover)` (`--normal-bg`) |
| Toast text | `var(--popover-foreground)` (`--normal-text`) |
| Toast border | `var(--border)` (`--normal-border`) |
| Toast radius | `rounded-2xl` (via `toastOptions.classes.toast`) |
| Icons | Lucide (`CircleCheckIcon`, `InfoIcon`, `TriangleAlertIcon`, `OctagonXIcon`, `Loader2Icon`, `XIcon`) à `size-4` |
| Montage | global dans `app/app.vue` (`<Sonner />`) |

**Pattern notes :** Toaster monté **une fois** au niveau racine (`app.vue`). Pour déclencher un toast depuis n'importe où : `import { toast } from 'vue-sonner'` puis `toast.success('...')` / `toast.error('...')`. Le composant fusionne `toastOptions` (props passées) avec les classes par défaut pour éviter le conflit de double binding. Couleurs via tokens sémantiques (popover, pas background).

### 3.7 — Progress (propriétés de cohérence)

File: `app/components/ui/progress/Progress.vue`
Last updated: 2026-07-10 (F3)

| Property | Class |
| --- | --- |
| Background (track) | `bg-muted` |
| Indicator | `bg-primary size-full flex-1 transition-all` |
| Border radius | `rounded-full` |
| Height | `h-1` (ciblé via prop `class`) |
| Layout | `relative flex w-full items-center overflow-x-hidden` |

**Pattern notes :** Reka UI `ProgressRoot`/`ProgressIndicator`. La valeur passe par `modelValue` (0–100). L'indicateur se déplace via `translateX(-${100 - value}%)`. Hauteur par défaut `h-1` (fine, pour feedback upload) — ajuster via `class`. Rayon `rounded-full`. `transition-all` pour une animation fluide.

### 3.8 — AlertDialog (propriétés de cohérence)

File: `app/components/ui/alert-dialog/` — `AlertDialog`, `AlertDialogTrigger`,
`AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`,
`AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogMedia`.
Last updated: 2026-07-10 (F3)

| Property | Class |
| --- | --- |
| Overlay | `bg-black/50` (data-[state=open]:animé) |
| Content background | `bg-card` |
| Content border/ring | `ring-1 ring-foreground/10` (cohérent avec Card) |
| Content radius | `rounded-xl` |
| Content spacing | `gap-4 p-6` |
| Content max size | `max-w-md` |
| Title | `text-lg font-medium` |
| Description | `text-muted-foreground` |
| Actions | `justify-end gap-2` (Footer) |
| Animation | `data-[state=open]:animate-in ...` (tw-animate-css) |

**Pattern notes :** Reka UI `AlertDialogRoot` (a11y native — focus trap, ESC, aria). Utilisé pour les **actions destructives/irréversibles** (confirmation re-upload CV). `AlertDialogAction` = bouton primaire (confirme), `AlertDialogCancel` = bouton secondaire (annule). Contenu centré via overlay. Rayon `rounded-xl` + ring `ring-foreground/10` cohérent avec Card. Le `v-model:open` permet un contrôle programmatique.

### 3.9 — Layouts & landing (propriétés de cohérence)

Files: `app/layouts/default.vue`, `app/layouts/auth.vue`, `app/pages/index.vue`, `app/error.vue`
Last updated: 2026-07-10

| Property | Class |
| --- | --- |
| Page background | `bg-background text-foreground` |
| Header border | `border-b` (séparateur header) |
| Container | `mx-auto max-w-6xl px-6` (header) / `max-w-3xl` (landing hero) / `max-w-md`/`max-w-sm` (centré) |
| Header height | `h-14` |
| Hero titre | `text-4xl font-bold tracking-tight sm:text-5xl` |
| Hero sous-titre | `text-lg text-muted-foreground` |
| Eyebrow | `text-sm font-medium text-muted-foreground` |
| Section spacing | `py-24` (hero centré) |
| Focus ring global | `outline-ring/50` (base layer) |

**Pattern notes :** Trois largeurs de container à utiliser selon contexte : `max-w-6xl` (app pleine largeur), `max-w-3xl` (contenu éditorial/hero), `max-w-sm`/`max-w-md` (centré auth/error). Le header fait toujours `h-14 border-b`. Titres en `tracking-tight`. Texte discret = `text-muted-foreground` — jamais de couleur ad hoc.

---

## 4. Composants métier

### 4.1 — CvUpload (propriétés de cohérence)

File: `app/components/cv/CvUpload.vue`
Last updated: 2026-07-10 (F3)

| Property | Class |
| --- | --- |
| Background (zone) | transparent (hérite du Card parent) |
| Border (dropzone) | `border border-dashed border-border` ; survol `hover:border-primary/50 hover:bg-accent` ; drag `border-primary bg-accent` |
| Border radius | `rounded-lg` |
| Spacing | `px-6 py-10` (dropzone) ; `gap-3` interne |
| Text — primary | `text-sm font-medium` (instruction) |
| Text — secondary | `text-xs text-muted-foreground` (contrainte PDF/5 Mo) |
| Focus | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| Disabled (uploading) | `pointer-events-none opacity-60` |
| Icon container | `size-10 rounded-full bg-muted` (icône centrée) |
| Progress bar | primitive `Progress` `h-1` + `%` `text-xs tabular-nums text-muted-foreground` |
| States | `Loader2 animate-spin` (uploading) / `Upload` (idle) |

**Pattern notes :** Dropzone cliquable ET zone de drop. La garde UI (PDF/5 Mo) est pour le feedback immédiat — le contrôle de sécurité réel reste serveur (`onBeforeGenerateToken` via `allowedContentTypes`/`maximumSizeInBytes` appliqués par Blob). Icônes Lucide (`Upload`, `Loader2`). Émet `uploaded` en succès (le parent rafraîchit + redirige). Toasts via `vue-sonner` pour succès/erreur. N'utilise que des tokens (`border`, `primary`, `accent`, `muted`, `ring`) — aucune valeur ad hoc.

**Section « Mes CV » du dashboard** (F3) : liste de versions dans une Card standard (ring `ring-foreground/10`, rayon `rounded-xl`). Chaque item = `border px-4 py-3 rounded-md` avec icône `FileText` dans `size-9 rounded-md bg-muted`. Badge de statut `rounded-full px-2 py-0.5 text-xs` (`bg-accent` pour parsed, `bg-muted` pour pending). Boutons de re-upload (AlertDialog confirmation) + téléchargement (icône `Download`).

---

## 5. Layouts

| Layout | Fichier | Usage |
|---|---|---|
| `default` | `app/layouts/default.vue` | Header minimal (logo + nav placeholder) + `<slot/>`. Pages publiques & app. |
| `auth` | `app/layouts/auth.vue` | Centré max-w-sm + `<slot/>`. Futurs écrans Clerk (F2). |

`app/app.vue` : `<NuxtLayout><NuxtPage/></NuxtLayout>`.
`app/error.vue` : page d'erreur globale (Card shadcn + bouton retour).

---

## 6. Historique

- **2026-07-10 (F1)** — Initialisation. Tokens neutral + Tailwind v4 CSS-first
  + primitives Button, Card (+6), Input, Label. Layouts default + auth. Landing
  `pages/index.vue`.
- **2026-07-10 (F2)** — Primitives Checkbox + Sonner (toasts). Header default.vue
  enrichi (SignedIn/SignedOut + UserButton). Pages sign-in/sign-up/onboarding/
  onboarding/upload-cv/dashboard. Sonner monté dans app.vue.
- **2026-07-10 (F3)** — Primitives Progress + AlertDialog. Premier composant
  métier : `CvUpload.vue` (dropzone + progress + états). Dashboard enrichi
  (section « Mes CV » : liste versions, re-upload avec confirmation, télécharge­
  ment). Page onboarding/upload-cv réelle (remplace placeholder F2).
