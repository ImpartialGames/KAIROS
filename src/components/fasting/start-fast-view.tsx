import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { BrandLogo } from '@/components/brand/brand-logo';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { PROTOCOL_TARGET_HOURS, type FastingProtocol } from '@/schemas/fast-session';
import { selectNeedsPrecautions, useAppStore } from '@/stores/app-store';
import { fastingStore } from '@/stores/fasting-store';
import { colors } from '@/theme/tokens';
import { Text, TextInput, View } from '@/tw';

const NAMED_PROTOCOLS = ['16:8', '18:6', '20:4', 'OMAD'] as const;
const MIN_CUSTOM_HOURS = 1;
const MAX_CUSTOM_HOURS = 168;
const FULL_DAY_HOURS = 24;

const goldGlow = {
  shadowColor: colors.accent,
  shadowOpacity: 0.5,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6,
} as const;

function parseCustomHours(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) {
    return null;
  }
  const hours = Number(raw.trim());
  return hours >= MIN_CUSTOM_HOURS && hours <= MAX_CUSTOM_HOURS ? hours : null;
}

/** Carte d'un protocole nommé (16:8…) — dégradé cuivre lumineux si sélectionnée,
 *  verre sombre sinon ; enfoncement au toucher. */
function ProtocolCard({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale style={{ flex: 1 }} onPress={onPress} accessibilityState={{ selected }}>
      {selected ? (
        <View style={goldGlow} className="overflow-hidden rounded-2xl">
          <LinearGradient
            colors={[colors.accentBright, colors.accentDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="items-center gap-2 px-2 py-5">
              <Text className="font-sans-bold text-lg tracking-tight text-background">{label}</Text>
              <View className="h-1 w-1 rounded-full bg-background" />
            </View>
          </LinearGradient>
        </View>
      ) : (
        <GlassCard contentClassName="items-center gap-2 px-2 py-5">
          <Text className="font-sans-medium text-lg tracking-tight text-content-muted">
            {label}
          </Text>
          <View className="h-1 w-1 rounded-full bg-transparent" />
        </GlassCard>
      )}
    </PressableScale>
  );
}

/** Choix du protocole et démarrage — toujours derrière la porte précautions. */
export function StartFastView() {
  const { t } = useTranslation();
  const router = useRouter();
  const needsPrecautions = useAppStore(selectNeedsPrecautions);
  const [protocol, setProtocol] = useState<FastingProtocol>('16:8');
  const [customHours, setCustomHours] = useState('');
  const [starting, setStarting] = useState(false);

  const resolvedCustomHours = parseCustomHours(customHours);
  const isCustom = protocol === 'custom';
  const canStart = !isCustom || resolvedCustomHours !== null;

  const fastingHours = isCustom ? resolvedCustomHours : PROTOCOL_TARGET_HOURS[protocol];
  const eatingHours =
    fastingHours !== null && fastingHours < FULL_DAY_HOURS ? FULL_DAY_HOURS - fastingHours : null;

  const onStart = async () => {
    if (needsPrecautions) {
      router.push('/precautions');
      return;
    }
    if (!canStart || starting) {
      return;
    }
    setStarting(true);
    try {
      await fastingStore.getState().startFast({
        protocol,
        targetHours: isCustom ? (resolvedCustomHours as number) : undefined,
      });
    } catch {
      Alert.alert(t('timer.startError'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <View className="gap-8">
      <BrandLogo />

      <View className="gap-4">
        <Text className="text-center font-sans-medium text-xs uppercase tracking-[3px] text-accent">
          {t('timer.chooseProtocol')}
        </Text>

        <View className="flex-row gap-3">
          {NAMED_PROTOCOLS.map((item) => (
            <ProtocolCard
              key={item}
              label={t(`timer.protocols.${item}`)}
              selected={protocol === item}
              onPress={() => setProtocol(item)}
            />
          ))}
        </View>

        <PressableScale
          onPress={() => setProtocol('custom')}
          accessibilityState={{ selected: isCustom }}
        >
          <GlassCard contentClassName="flex-row items-center gap-3 px-4 py-4">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-raised">
              <Ionicons name="options-outline" size={18} color={colors.accent} />
            </View>
            <Text
              className={
                isCustom
                  ? 'flex-1 font-sans-medium text-base text-accent'
                  : 'flex-1 font-sans-medium text-base text-content-muted'
              }
            >
              {t('timer.protocols.custom')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={isCustom ? colors.accent : colors.contentFaint}
            />
          </GlassCard>
        </PressableScale>

        {isCustom && (
          <TextInput
            accessibilityLabel={t('timer.customHoursLabel')}
            value={customHours}
            onChangeText={setCustomHours}
            keyboardType="number-pad"
            placeholder={t('timer.customHoursPlaceholder')}
            placeholderTextColor={colors.contentFaint}
            className="rounded-2xl border border-border bg-surface px-4 py-3 font-sans text-base text-content"
          />
        )}
      </View>

      <GlassCard elevated contentClassName="gap-4 p-4">
        <View className="flex-row items-center gap-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-raised">
            <Ionicons name="sunny-outline" size={20} color={colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-sans-medium text-xl tracking-tight text-content">
              {fastingHours !== null
                ? t('timer.protocolHours', { hours: fastingHours })
                : t('timer.customHoursLabel')}
            </Text>
            {eatingHours !== null && (
              <Text className="font-sans text-sm text-content-faint">
                {t('timer.eatingWindow', { hours: eatingHours })}
              </Text>
            )}
          </View>
        </View>
        <View className="h-px self-stretch bg-border" />
      </GlassCard>

      <PressableScale
        onPress={onStart}
        disabled={!canStart || starting}
        style={[{ alignSelf: 'stretch' }, canStart ? goldGlow : undefined]}
      >
        <View className="overflow-hidden rounded-2xl" style={{ opacity: canStart ? 1 : 0.5 }}>
          <LinearGradient
            colors={[colors.accentBright, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View className="flex-row items-center justify-center gap-3 px-6 py-4">
              <Text className="font-sans-bold text-base uppercase tracking-[1px] text-background">
                {t('timer.start')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
            </View>
          </LinearGradient>
        </View>
      </PressableScale>

      <View className="flex-row items-center justify-center gap-2">
        <Ionicons name="shield-checkmark-outline" size={14} color={colors.contentFaint} />
        <Text className="font-sans text-xs tracking-[1px] text-content-faint">
          {t('timer.motto')}
        </Text>
      </View>
    </View>
  );
}
