import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, useWindowDimensions } from 'react-native';

import { FastingRing } from '@/components/fasting/fasting-ring';
import { elapsedMs, formatHms, nextMilestone, progressRatio, remainingMs } from '@/domain/fasting';
import type { FastSession } from '@/schemas/fast-session';
import { fastingStore, useFastingStore } from '@/stores/fasting-store';
import { colors } from '@/theme/tokens';
import { Pressable, Text, View } from '@/tw';

const goldGlow = {
  shadowColor: colors.accent,
  shadowOpacity: 0.5,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6,
} as const;

/** Pastille d'icône ronde utilisée dans la carte des paliers. */
function IconBadge({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised">
      <Ionicons name={name} size={18} color={colors.accent} />
    </View>
  );
}

/** Session en cours : anneau de progression, chrono, paliers, actions. */
export function ActiveFastView({ session }: { session: FastSession }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const reachedHours = useFastingStore((state) => state.reachedHours);
  const [now, setNow] = useState(() => Date.now());
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      // Enregistre les paliers franchis pendant que l'écran est ouvert.
      void fastingStore.getState().syncMilestones(tick);
    }, 1000);
    return () => clearInterval(interval);
  }, [session.id]);

  const elapsed = elapsedMs(session.startedAt, now);
  const remaining = remainingMs(session.startedAt, session.targetHours, now);
  const progress = progressRatio(session.startedAt, session.targetHours, now);
  const upcoming = nextMilestone(session.startedAt, now);
  const ringSize = Math.min(width - 56, 330);

  const runAction = async (action: () => Promise<void>) => {
    if (ending) {
      return;
    }
    setEnding(true);
    try {
      await action();
    } finally {
      setEnding(false);
    }
  };

  const onCancel = () => {
    Alert.alert(t('timer.cancelConfirmTitle'), t('timer.cancelConfirmBody'), [
      { text: t('timer.cancelConfirmNo'), style: 'cancel' },
      {
        text: t('timer.cancelConfirmYes'),
        style: 'destructive',
        onPress: () => void runAction(() => fastingStore.getState().cancelFast()),
      },
    ]);
  };

  return (
    <View className="gap-8 self-stretch">
      <View className="items-center">
        <FastingRing progress={progress} overTarget={remaining < 0} size={ringSize}>
          <View className="items-center gap-1 px-10">
            <Ionicons name="hourglass-outline" size={20} color={colors.accent} />
            <Text className="mt-1 font-sans text-xs uppercase tracking-[3px] text-content-faint">
              {t('timer.elapsedLabel')}
            </Text>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              className="font-sans-bold text-5xl text-content"
            >
              {formatHms(elapsed)}
            </Text>
            <Text className="font-sans text-sm text-content-muted">
              {t('timer.targetLabel', {
                hours: session.targetHours,
                protocol: t(`timer.protocols.${session.protocol}`),
              })}
            </Text>

            <View className="my-2 h-px w-28 bg-border" />

            {remaining >= 0 ? (
              <>
                <Text className="font-sans text-sm text-content-muted">
                  {t('timer.remainingLabel')}
                </Text>
                <Text className="font-sans-medium text-2xl text-accent-bright">
                  {formatHms(remaining)}
                </Text>
              </>
            ) : (
              <Text className="font-sans-medium text-base text-accent-bright">
                {t('timer.overTarget', { time: formatHms(-remaining) })}
              </Text>
            )}
          </View>
        </FastingRing>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full border border-accent-deep">
            <Ionicons name="flag-outline" size={15} color={colors.accent} />
          </View>
          <Text className="font-sans-medium text-sm uppercase tracking-[2px] text-content-muted">
            {t('timer.reachedTitle')}
          </Text>
        </View>

        <View className="rounded-2xl border border-border bg-surface">
          <View className="flex-row items-center gap-4 px-4 py-4">
            <IconBadge name="star-outline" />
            {reachedHours.length === 0 ? (
              <Text className="flex-1 font-serif text-base text-content-muted">
                {t('timer.noMilestoneYet')}
              </Text>
            ) : (
              <View className="flex-1 flex-row flex-wrap gap-2">
                {reachedHours.map((hours) => (
                  <View
                    key={hours}
                    className="rounded-full border border-accent-deep bg-surface-raised px-4 py-1"
                  >
                    <Text className="font-sans-medium text-sm text-accent-bright">{hours} h</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="mx-4 h-px bg-border" />

          <View className="flex-row items-center gap-4 px-4 py-4">
            <IconBadge name="calendar-outline" />
            <Text className="flex-1 font-serif text-base text-content-muted">
              {upcoming === null
                ? t('timer.allMilestonesReached')
                : t('timer.nextMilestone', { hours: upcoming })}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={ending}
          onPress={() => void runAction(() => fastingStore.getState().completeFast())}
          style={ending ? undefined : goldGlow}
          className="overflow-hidden rounded-2xl"
        >
          <LinearGradient
            colors={[colors.accentBright, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ opacity: ending ? 0.6 : 1 }}
          >
            <View className="flex-row items-center justify-center gap-3 px-6 py-4">
              <Text className="font-sans-bold text-base text-background">
                {t('timer.complete')}
              </Text>
              <Ionicons name="sparkles" size={16} color={colors.background} />
            </View>
          </LinearGradient>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={ending}
          onPress={onCancel}
          className="items-center rounded-2xl border border-border px-6 py-4 active:bg-surface"
        >
          <Text className="font-sans-medium text-base text-danger">{t('timer.cancel')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
