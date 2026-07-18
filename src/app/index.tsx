import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveFastView } from '@/components/fasting/active-fast-view';
import { StartFastView } from '@/components/fasting/start-fast-view';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useFastingStore } from '@/stores/fasting-store';
import { colors } from '@/theme/tokens';
import { ScrollView, Text, View } from '@/tw';

/** Écran principal : choix du protocole (logo + verre), ou session de jeûne en cours. */
export default function HomeScreen() {
  const { t } = useTranslation('timeline');
  const router = useRouter();
  const activeSession = useFastingStore((state) => state.activeSession);

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Accès permanent à la timeline biochimique (en jeûne comme au repos). */}
        <View className="flex-row justify-end px-6 pt-2">
          <PressableScale onPress={() => router.push('/timeline')} accessibilityLabel={t('title')}>
            <GlassCard contentClassName="flex-row items-center gap-2 px-4 py-2">
              <Ionicons name="pulse" size={16} color={colors.accent} />
              <Text className="font-sans-medium text-sm text-content">{t('link')}</Text>
            </GlassCard>
          </PressableScale>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center gap-6 px-6 py-8"
        >
          {activeSession ? <ActiveFastView session={activeSession} /> : <StartFastView />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
