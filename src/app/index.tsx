import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveFastView } from '@/components/fasting/active-fast-view';
import { StartFastView } from '@/components/fasting/start-fast-view';
import { useFastingStore } from '@/stores/fasting-store';
import { ScrollView, Text, View } from '@/tw';

/** Écran principal : choix du protocole, ou session de jeûne en cours. */
export default function HomeScreen() {
  const { t } = useTranslation();
  const activeSession = useFastingStore((state) => state.activeSession);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="flex-grow justify-center gap-10 px-8 py-10"
      >
        <View className="items-center gap-2">
          <Text className="font-sans-medium text-sm uppercase tracking-[4px] text-accent">
            {t('appName')}
          </Text>
          <Text className="font-serif text-lg text-content-muted">{t('tagline')}</Text>
        </View>

        {activeSession ? <ActiveFastView session={activeSession} /> : <StartFastView />}
      </ScrollView>
    </SafeAreaView>
  );
}
