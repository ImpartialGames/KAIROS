// SDK 57 : expo-router embarque react-navigation — importer les thèmes depuis expo-router.
import { DarkTheme, type Theme } from 'expo-router';

import { colors, fonts } from '@/theme/tokens';

/** Thème de navigation dérivé des tokens — consommé par le ThemeProvider racine. */
export const kairosNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.content,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    ...DarkTheme.fonts,
    regular: { fontFamily: fonts.sans, fontWeight: '400' },
    medium: { fontFamily: fonts.sansMedium, fontWeight: '500' },
    bold: { fontFamily: fonts.sansBold, fontWeight: '700' },
    heavy: { fontFamily: fonts.sansBold, fontWeight: '700' },
  },
};
