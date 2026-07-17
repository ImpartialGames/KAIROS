/**
 * Source de vérité unique des tokens de design (CLAUDE.md §Design).
 *
 * Les écrans consomment ces tokens via les classes NativeWind déclarées dans
 * `src/global.css` (@theme) — jamais de couleur ou de police en dur dans un
 * composant. Ce module sert les consommateurs programmatiques (thème de
 * navigation, splash, notifications…).
 *
 * `src/theme/__tests__/tokens-sync.test.ts` garantit que global.css et ce
 * fichier restent identiques : toute modification doit se faire dans les deux.
 */

/** Palette brute — identité noir/anthracite + crème, accent cuivre-ambré. */
export const palette = {
  noir: '#0D0B08',
  anthracite: '#1A1712',
  anthraciteEleve: '#241F18',
  brunBordure: '#3A3226',
  creme: '#F2EAD9',
  cremeSourde: '#B9AF9C',
  cremeEteinte: '#7E7666',
  cuivre: '#C87B3F',
  ambre: '#E39A56',
  cuivreProfond: '#9A5A28',
  // Accent froid ponctuel (états avant/après cétose) — jamais couleur de marque.
  glacier: '#97A6AC',
  terracotta: '#C25A4A',
  olive: '#97A05F',
} as const;

/** Tokens sémantiques — c'est eux que le code consomme, pas la palette. */
export const colors = {
  background: palette.noir,
  surface: palette.anthracite,
  surfaceRaised: palette.anthraciteEleve,
  border: palette.brunBordure,
  content: palette.creme,
  contentMuted: palette.cremeSourde,
  contentFaint: palette.cremeEteinte,
  accent: palette.cuivre,
  accentBright: palette.ambre,
  accentDeep: palette.cuivreProfond,
  cold: palette.glacier,
  danger: palette.terracotta,
  success: palette.olive,
} as const;

/**
 * Familles typographiques (noms exacts des polices chargées par expo-font).
 * Serif éditoriale (Lora) : contenu pédagogique — lexique, explications.
 * Sans géométrique (Space Grotesk) : UI fonctionnelle — timer, chiffres, navigation.
 */
export const fonts = {
  serif: 'Lora_400Regular',
  serifMedium: 'Lora_500Medium',
  serifSemibold: 'Lora_600SemiBold',
  sans: 'SpaceGrotesk_400Regular',
  sansMedium: 'SpaceGrotesk_500Medium',
  sansBold: 'SpaceGrotesk_700Bold',
} as const;

export type SemanticColor = keyof typeof colors;
export type FontToken = keyof typeof fonts;
