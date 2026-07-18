import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { timeline } from '@/content';
import type { TimelinePhase } from '@/content/schema';
import { elapsedMs, formatHms } from '@/domain/fasting';
import { isPreKetosis, makePhaseStatus, type PhaseStatus } from '@/domain/timeline-status';
import { useFastingStore } from '@/stores/fasting-store';
import { colors } from '@/theme/tokens';
import { ScrollView, Text, View } from '@/tw';

const STATUS_ICON: Record<Exclude<PhaseStatus, 'neutral'>, keyof typeof Ionicons.glyphMap> = {
  past: 'checkmark',
  current: 'pulse',
  next: 'time-outline',
  future: 'ellipse-outline',
};

/** Un palier de la timeline : épine colorée, badge horaire, contenu scientifique. */
function PhaseCard({ phase, status }: { phase: TimelinePhase; status: PhaseStatus }) {
  const { t } = useTranslation('timeline');
  const cold = isPreKetosis(phase.hours);
  const tone = cold ? colors.cold : colors.accent;

  const active = status === 'past' || status === 'current';
  const dim = status === 'future';
  const filledBadge = active;

  return (
    <View className="relative" style={{ opacity: dim ? 0.5 : 1 }}>
      {/* Épine de timeline colorée selon avant/après cétose et l'avancement. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 10,
          bottom: 10,
          width: 3,
          borderRadius: 2,
          backgroundColor: tone,
          opacity: active ? 1 : 0.35,
        }}
      />

      <GlassCard className="ml-3" elevated={status === 'current'} contentClassName="gap-4 p-5">
        <View className="flex-row items-center justify-between">
          <View
            style={
              filledBadge
                ? { backgroundColor: tone }
                : { borderWidth: 1, borderColor: tone, backgroundColor: 'transparent' }
            }
            className="rounded-full px-3 py-1"
          >
            <Text
              className="font-sans-bold text-sm tracking-tight"
              style={{ color: filledBadge ? colors.background : tone }}
            >
              {phase.hours} h
            </Text>
          </View>

          {status !== 'neutral' && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name={STATUS_ICON[status]} size={14} color={tone} />
              <Text
                className="font-sans-medium text-xs uppercase tracking-[1px]"
                style={{ color: tone }}
              >
                {t(`status.${status}`)}
              </Text>
            </View>
          )}
        </View>

        <View className="gap-1.5">
          <Text className="font-serif-semibold text-xl tracking-tight text-content">
            {phase.title}
          </Text>
          <Text className="font-serif text-base leading-6 text-content-muted">
            {phase.whatHappens}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="font-sans-medium text-xs uppercase tracking-[2px] text-content-faint">
            {t('mechanisms')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {phase.mechanisms.map((mechanism) => (
              <View
                key={mechanism}
                className="rounded-full border border-border bg-surface-raised px-3 py-1"
              >
                <Text className="font-sans text-xs text-content-muted">{mechanism}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <View className="flex-row gap-2">
            <Ionicons name="body-outline" size={16} color={colors.accent} />
            <Text className="flex-1 font-serif text-sm leading-5 text-content-muted">
              <Text className="text-content">{t('body')}. </Text>
              {phase.benefitsBody}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
            <Text className="flex-1 font-serif text-sm leading-5 text-content-muted">
              <Text className="text-content">{t('mind')}. </Text>
              {phase.benefitsMind}
            </Text>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

/** Timeline biochimique — les 9 paliers, liés en direct à la session en cours. */
export default function TimelineScreen() {
  const { t } = useTranslation('timeline');
  const router = useRouter();
  const activeSession = useFastingStore((state) => state.activeSession);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeSession) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const statusFor = makePhaseStatus(
    activeSession ? { startedAt: activeSession.startedAt, now } : null,
  );
  const elapsed = activeSession ? formatHms(elapsedMs(activeSession.startedAt, now)) : null;

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View className="flex-row items-center gap-3 px-6 pb-2 pt-2">
          <PressableScale onPress={() => router.back()} accessibilityLabel={t('link')}>
            <View className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
              <Ionicons name="chevron-back" size={20} color={colors.content} />
            </View>
          </PressableScale>
          <Text className="font-serif-semibold text-2xl tracking-tight text-content">
            {t('title')}
          </Text>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 pb-10 pt-2">
          <Text className="font-serif text-base leading-6 text-content-muted">
            {elapsed ? t('elapsed', { time: elapsed }) : t('subtitle')}
          </Text>
          {!activeSession && (
            <Text className="font-sans text-sm text-content-faint">{t('educational')}</Text>
          )}

          <View className="flex-row gap-4 pb-1">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.cold }} />
              <Text className="font-sans text-xs text-content-faint">{t('legend.before')}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colors.accent }}
              />
              <Text className="font-sans text-xs text-content-faint">{t('legend.after')}</Text>
            </View>
          </View>

          {timeline.map((phase) => (
            <PhaseCard key={phase.hours} phase={phase} status={statusFor(phase.hours)} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
