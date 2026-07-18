import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
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

/** Pastille d'accès à un pilier (timeline, lexique…) — verre, permanente. */
function NavPill({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label}>
      <GlassCard contentClassName="flex-row items-center gap-2 px-4 py-2">
        <Ionicons name={icon} size={16} color={colors.accent} />
        <Text className="font-sans-medium text-sm text-content">{label}</Text>
      </GlassCard>
    </PressableScale>
  );
}

/** Écran principal : choix du protocole (logo + verre), ou session de jeûne en cours. */
export default function HomeScreen() {
  const { t } = useTranslation(['timeline', 'lexicon', 'journal']);
  const router = useRouter();
  const activeSession = useFastingStore((state) => state.activeSession);

  const go = (href: Href) => () => router.push(href);

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Accès permanent aux piliers pédagogiques (en jeûne comme au repos). */}
        <View className="flex-row flex-wrap justify-end gap-2 px-6 pt-2">
          <NavPill icon="pulse" label={t('link', { ns: 'timeline' })} onPress={go('/timeline')} />
          <NavPill
            icon="book-outline"
            label={t('link', { ns: 'lexicon' })}
            onPress={go('/lexique')}
          />
          <NavPill
            icon="journal-outline"
            label={t('link', { ns: 'journal' })}
            onPress={go('/journal')}
          />
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
