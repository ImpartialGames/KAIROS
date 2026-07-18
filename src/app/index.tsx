import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveFastView } from '@/components/fasting/active-fast-view';
import { StartFastView } from '@/components/fasting/start-fast-view';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { useFastingStore } from '@/stores/fasting-store';
import { ScrollView, View } from '@/tw';

/** Écran principal : choix du protocole (logo + verre), ou session de jeûne en cours. */
export default function HomeScreen() {
  const activeSession = useFastingStore((state) => state.activeSession);

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      <SafeAreaView style={{ flex: 1 }}>
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
