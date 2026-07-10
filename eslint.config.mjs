// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Composants shadcn générés par la CLI (app/components/ui/**).
  // Ces fichiers utilisent `withDefaults` au runtime pour les valeurs par
  // défaut des props typées via interface, mais la règle vue/require-default-prop
  // ne remonte pas ces defaults (known-limitation du linter vs pattern shadcn).
  // On désactive la règle uniquement sur ce périmètre pour garder un signal
  // propre (0 warning) sans éditer les fichiers générés — qui ne doivent pas
  // être modifiés à la main (AGENTS.md §4.1).
  {
    name: 'shadcn-generated-disable-require-default-prop',
    files: ['app/components/ui/**/*.vue'],
    rules: {
      'vue/require-default-prop': 'off',
    },
  },
)
