import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { elapsedMs, formatHms, nextMilestone, progressRatio, remainingMs } from '@/domain/fasting';
import type { FastSession } from '@/schemas/fast-session';
import { fastingStore, useFastingStore } from '@/stores/fasting-store';
import { Pressable, Text, View } from '@/tw';

/** Session en cours : chrono, progression vers l'objectif, paliers, actions. */
export function ActiveFastView({ session }: { session: FastSession }) {
  const { t } = useTranslation();
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
      <View className="items-center gap-3 rounded-2xl border border-border bg-surface px-8 py-10">
        <Text className="font-sans text-xs uppercase tracking-[2px] text-content-faint">
          {t('timer.elapsedLabel')}
        </Text>
        <Text className="font-sans-bold text-6xl text-content">{formatHms(elapsed)}</Text>
        <Text className="font-sans text-sm text-content-muted">
          {t('timer.targetLabel', {
            hours: session.targetHours,
            protocol: t(`timer.protocols.${session.protocol}`),
          })}
        </Text>

        <View className="mt-2 h-2 self-stretch overflow-hidden rounded-full bg-surface-raised">
          <View
            className={
              remaining >= 0 ? 'h-2 rounded-full bg-accent' : 'h-2 rounded-full bg-accent-bright'
            }
            style={{ width: `${Math.max(progress * 100, 1)}%` }}
          />
        </View>
        <Text className="font-sans text-sm text-content-muted">
          {remaining >= 0
            ? t('timer.remaining', { time: formatHms(remaining) })
            : t('timer.overTarget', { time: formatHms(-remaining) })}
        </Text>
      </View>

      <View className="gap-3">
        <Text className="font-sans-medium text-sm uppercase tracking-[2px] text-accent">
          {t('timer.reachedTitle')}
        </Text>
        {reachedHours.length === 0 ? (
          <Text className="font-serif text-base text-content-muted">
            {t('timer.noMilestoneYet')}
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {reachedHours.map((hours) => (
              <View
                key={hours}
                className="rounded-full border border-accent-deep bg-surface px-4 py-1"
              >
                <Text className="font-sans-medium text-sm text-accent-bright">{hours} h</Text>
              </View>
            ))}
          </View>
        )}
        <Text className="font-serif text-base text-content-muted">
          {upcoming === null
            ? t('timer.allMilestonesReached')
            : t('timer.nextMilestone', { hours: upcoming })}
        </Text>
      </View>

      <View className="gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={ending}
          onPress={() => void runAction(() => fastingStore.getState().completeFast())}
          className="items-center rounded-2xl bg-accent px-6 py-4 active:bg-accent-deep disabled:opacity-60"
        >
          <Text className="font-sans-bold text-base text-background">{t('timer.complete')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={ending}
          onPress={onCancel}
          className="items-center rounded-2xl border border-border px-6 py-4"
        >
          <Text className="font-sans-medium text-base text-danger">{t('timer.cancel')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
