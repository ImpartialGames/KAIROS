import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, View } from '@/tw';

/**
 * Écran d'accueil provisoire — remplacé par le timer à l'étape 4.
 * Sert de preuve de bout en bout : tokens du thème (classes NativeWind),
 * typographies serif/sans chargées, chaînes via i18next.
 */
export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center gap-10 bg-background px-8">
        <View className="items-center gap-2">
          <Text className="font-sans-medium text-sm uppercase tracking-[4px] text-accent">
            {t('appName')}
          </Text>
          <Text className="font-serif text-lg text-content-muted">{t('tagline')}</Text>
        </View>

        <View className="items-center gap-3 rounded-2xl border border-border bg-surface px-10 py-8">
          <Text className="font-sans-bold text-6xl text-content">{t('home.sampleCountdown')}</Text>
          <Text className="font-sans text-xs text-content-faint">
            {t('home.sampleCountdownLabel')}
          </Text>
        </View>

        <View className="items-center gap-2">
          <Text className="font-serif-semibold text-xl text-content">
            {t('home.scaffoldTitle')}
          </Text>
          <Text className="text-center font-serif text-base leading-6 text-content-muted">
            {t('home.scaffoldBody')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
