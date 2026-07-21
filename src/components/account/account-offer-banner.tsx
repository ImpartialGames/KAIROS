import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { colors } from '@/theme/tokens';
import { Text, View } from '@/tw';

/**
 * Bannière non-bloquante proposant de créer un compte à un moment de valeur
 * (jamais un mur — l'invité peut l'ignorer). Renvoie vers l'écran compte.
 */
export function AccountOfferBanner({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation('account');
  const router = useRouter();

  return (
    <GlassCard elevated contentClassName="gap-3 p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="cloud-upload-outline" size={18} color={colors.accent} />
          <Text className="font-serif-semibold text-base text-content">{t('offerTitle')}</Text>
        </View>
        <PressableScale onPress={onDismiss} accessibilityLabel={t('offerDismiss')}>
          <Ionicons name="close" size={20} color={colors.contentFaint} />
        </PressableScale>
      </View>

      <Text className="font-serif text-sm leading-5 text-content-muted">{t('offerBody')}</Text>

      <PressableScale
        onPress={() => router.push({ pathname: '/account', params: { mode: 'signUp' } })}
        accessibilityLabel={t('offerCta')}
      >
        <View className="items-center rounded-2xl bg-accent px-6 py-3 active:bg-accent-deep">
          <Text className="font-sans-bold text-sm text-background">{t('offerCta')}</Text>
        </View>
      </PressableScale>
    </GlassCard>
  );
}
