import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveFastView } from '@/components/fasting/active-fast-view';
import { StartFastView } from '@/components/fasting/start-fast-view';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useAuthStore } from '@/stores/auth-store';
import { useFastingStore } from '@/stores/fasting-store';
import { colors } from '@/theme/tokens';
import { ScrollView, View } from '@/tw';

/** Écran principal : choix du protocole (logo + verre), ou session de jeûne en cours. */
export default function HomeScreen() {
  const { t } = useTranslation('account');
  const router = useRouter();
  const activeSession = useFastingStore((state) => state.activeSession);
  const signedIn = useAuthStore((state) => state.status === 'signedIn');

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      {/* Bas géré par la barre d'onglets — pas d'edge bas ici. */}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Accès au compte (connecté = pastille accent). */}
        <View className="flex-row justify-end px-6 pt-2">
          <PressableScale onPress={() => router.push('/account')} accessibilityLabel={t('title')}>
            <View className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
              <Ionicons
                name={signedIn ? 'person-circle' : 'person-circle-outline'}
                size={22}
                color={signedIn ? colors.accent : colors.contentMuted}
              />
            </View>
          </PressableScale>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center gap-6 px-6 pb-8"
        >
          {activeSession ? <ActiveFastView session={activeSession} /> : <StartFastView />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
