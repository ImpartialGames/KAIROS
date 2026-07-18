import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import {
  FASTING_PROTOCOLS,
  PROTOCOL_TARGET_HOURS,
  type FastingProtocol,
} from '@/schemas/fast-session';
import { selectNeedsPrecautions, useAppStore } from '@/stores/app-store';
import { fastingStore } from '@/stores/fasting-store';
import { colors } from '@/theme/tokens';
import { Pressable, Text, TextInput, View } from '@/tw';

const MIN_CUSTOM_HOURS = 1;
const MAX_CUSTOM_HOURS = 168;

function parseCustomHours(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) {
    return null;
  }
  const hours = Number(raw.trim());
  return hours >= MIN_CUSTOM_HOURS && hours <= MAX_CUSTOM_HOURS ? hours : null;
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
  const canStart = protocol !== 'custom' || resolvedCustomHours !== null;

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
        targetHours: protocol === 'custom' ? (resolvedCustomHours as number) : undefined,
      });
    } catch {
      Alert.alert(t('timer.startError'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <View className="gap-6 self-stretch">
      <Text className="text-center font-serif-semibold text-xl text-content">
        {t('timer.chooseProtocol')}
      </Text>

      <View className="flex-row flex-wrap justify-center gap-3">
        {FASTING_PROTOCOLS.map((item) => {
          const selected = item === protocol;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setProtocol(item)}
              className={
                selected
                  ? 'rounded-full border border-accent bg-accent px-5 py-2'
                  : 'rounded-full border border-border bg-surface px-5 py-2'
              }
            >
              <Text
                className={
                  selected
                    ? 'font-sans-medium text-sm text-background'
                    : 'font-sans-medium text-sm text-content-muted'
                }
              >
                {t(`timer.protocols.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {protocol !== 'custom' ? (
        <Text className="text-center font-sans text-sm text-content-faint">
          {t('timer.protocolHours', { hours: PROTOCOL_TARGET_HOURS[protocol] })}
        </Text>
      ) : (
        <View className="gap-2">
          <Text className="font-sans text-sm text-content-muted">
            {t('timer.customHoursLabel')}
          </Text>
          <TextInput
            accessibilityLabel={t('timer.customHoursLabel')}
            value={customHours}
            onChangeText={setCustomHours}
            keyboardType="number-pad"
            placeholder={t('timer.customHoursPlaceholder')}
            placeholderTextColor={colors.contentFaint}
            className="rounded-2xl border border-border bg-surface px-4 py-3 font-sans text-base text-content"
          />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={!canStart || starting}
        onPress={onStart}
        className="items-center rounded-2xl bg-accent px-6 py-4 active:bg-accent-deep disabled:opacity-60"
      >
        <Text className="font-sans-bold text-base text-background">{t('timer.start')}</Text>
      </Pressable>
    </View>
  );
}
