import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import type { DimensionValue } from 'react-native';

/**
 * Logo de marque (emblème éclipse + KAIROS + baseline), décliné par langue :
 * la baseline est intégrée à l'image (« Le moment juste » / « The right moment »),
 * on sélectionne donc le bon fichier selon la langue active.
 */
// Chemins relatifs (les assets sont hors de src/, l'alias @/ ne les couvre pas).
const LOGOS: Record<string, ReturnType<typeof require>> = {
  fr: require('../../../assets/images/logo-fr.png'),
  en: require('../../../assets/images/logo-en.png'),
};

export function BrandLogo({ height = 320 }: { height?: DimensionValue }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] ?? 'fr';
  const source = LOGOS[lang] ?? LOGOS.fr!;

  return (
    <Image
      testID="brand-logo"
      accessibilityRole="image"
      accessibilityLabel={`${t('appName')} — ${t('tagline')}`}
      source={source}
      contentFit="contain"
      style={{ width: '100%', height }}
    />
  );
}
