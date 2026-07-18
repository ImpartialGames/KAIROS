import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { colors } from '@/theme/tokens';
import { Text, View } from '@/tw';

/**
 * Écran affiché quand l'ouverture de la base échoue au démarrage : message clair
 * + réessayer, au lieu d'une UI dégradée silencieuse (revue Phase 0).
 */
export function BootstrapError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('errors');

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center px-8">
          <GlassCard elevated contentClassName="items-center gap-4 p-6">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-surface-raised">
              <Ionicons name="warning-outline" size={24} color={colors.accent} />
            </View>
            <Text className="text-center font-serif-semibold text-xl text-content">
              {t('bootstrapTitle')}
            </Text>
            <Text className="text-center font-serif text-base leading-6 text-content-muted">
              {t('bootstrapBody')}
            </Text>
            <PressableScale onPress={onRetry} accessibilityLabel={t('retry')}>
              <View className="rounded-2xl bg-accent px-6 py-3 active:bg-accent-deep">
                <Text className="font-sans-bold text-base text-background">{t('retry')}</Text>
              </View>
            </PressableScale>
          </GlassCard>
        </View>
      </SafeAreaView>
    </View>
  );
}
