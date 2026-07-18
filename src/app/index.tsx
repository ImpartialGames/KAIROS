import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { selectNeedsPrecautions, useAppStore } from '@/stores/app-store';
import { Pressable, Text, View } from '@/tw';

/**
 * Écran d'accueil provisoire — remplacé par le timer à l'étape 4.
 * Porte déjà le vrai point d'entrée du jeûne : au tout premier démarrage,
 * l'écran précautions doit être lu et accepté avant tout.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const needsPrecautions = useAppStore(selectNeedsPrecautions);

  const onStartFast = () => {
    if (needsPrecautions) {
      router.push('/precautions');
      return;
    }
    // Étape 4 : démarrage réel de la session via le store timer.
  };

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

        <View className="items-center gap-3 self-stretch">
          <Pressable
            accessibilityRole="button"
            onPress={onStartFast}
            className="items-center self-stretch rounded-2xl bg-accent px-6 py-4 active:bg-accent-deep"
          >
            <Text className="font-sans-bold text-base text-background">{t('home.startFast')}</Text>
          </Pressable>
          {!needsPrecautions && (
            <Text className="text-center font-sans text-xs text-content-faint">
              {t('home.timerComingSoon')}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
