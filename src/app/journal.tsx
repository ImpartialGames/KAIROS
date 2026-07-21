import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { WellbeingInsights } from '@/components/journal/wellbeing-insights';
import { buildJournalFeed } from '@/domain/journal-feed';
import { buildWellbeingCorrelation } from '@/domain/wellbeing-correlation';
import type { FastSession } from '@/schemas/fast-session';
import { RESSENTI_TAGS, type JournalEntry, type RessentiTag } from '@/schemas/journal-entry';
import { journalStore, useJournalStore } from '@/stores/journal-store';
import { colors } from '@/theme/tokens';
import { ScrollView, Text, TextInput, View } from '@/tw';

const MOOD_SCALE = [1, 2, 3, 4, 5] as const;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function durationParts(ms: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** Sélecteur d'humeur 1–5 (re-toucher la valeur active l'efface). */
function MoodSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { t } = useTranslation('journal');
  return (
    <View className="flex-row gap-2">
      {MOOD_SCALE.map((n) => {
        const active = value !== null && n <= value;
        return (
          <PressableScale
            key={n}
            onPress={() => onChange(value === n ? null : n)}
            accessibilityLabel={t('moodValue', { value: n })}
            accessibilityState={{ selected: active }}
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-full border"
              style={{
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accent : 'transparent',
              }}
            >
              <Text
                className="font-sans-bold text-sm"
                style={{ color: active ? colors.background : colors.contentFaint }}
              >
                {n}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Sélecteur de ressentis (multi-choix) — vocabulaire contrôlé. */
function TagSelector({
  selected,
  onToggle,
}: {
  selected: readonly RessentiTag[];
  onToggle: (tag: RessentiTag) => void;
}) {
  const { t } = useTranslation('journal');
  return (
    <View className="flex-row flex-wrap gap-2">
      {RESSENTI_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <PressableScale
            key={tag}
            onPress={() => onToggle(tag)}
            accessibilityLabel={t(`tag_${tag}`)}
            accessibilityState={{ selected: active }}
          >
            <View
              className="rounded-full border px-3 py-1.5"
              style={{
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accent : 'transparent',
              }}
            >
              <Text
                className="font-sans-medium text-xs"
                style={{ color: active ? colors.background : colors.contentMuted }}
              >
                {t(`tag_${tag}`)}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Ressentis d'une note enregistrée (lecture seule). */
function TagChips({ tags }: { tags: readonly RessentiTag[] }) {
  const { t } = useTranslation('journal');
  return (
    <View className="flex-row flex-wrap gap-2">
      {tags.map((tag) => (
        <View key={tag} className="rounded-full border border-accent-deep bg-surface px-3 py-1">
          <Text className="font-sans-medium text-xs text-accent-bright">{t(`tag_${tag}`)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Petits points d'humeur (lecture) pour une note enregistrée. */
function MoodDots({ value }: { value: number }) {
  return (
    <View className="flex-row gap-1">
      {MOOD_SCALE.map((n) => (
        <View
          key={n}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: n <= value ? colors.accent : colors.border }}
        />
      ))}
    </View>
  );
}

function SessionCard({ session, phases }: { session: FastSession; phases: number[] }) {
  const { t } = useTranslation('journal');
  const done = session.status === 'completed';
  const { hours, minutes } = durationParts(
    (session.endedAt ?? session.startedAt) - session.startedAt,
  );

  return (
    <GlassCard contentClassName="gap-3 p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name={done ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={16}
            color={done ? colors.accent : colors.contentFaint}
          />
          <Text className="font-sans-medium text-sm text-content">
            {done ? t('sessionCompleted') : t('sessionCancelled')}
          </Text>
        </View>
        <Text className="font-sans text-xs text-content-faint">
          {formatDate(session.startedAt)}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="rounded-full border border-border bg-surface-raised px-3 py-1">
          <Text className="font-sans-medium text-xs text-content-muted">{session.protocol}</Text>
        </View>
        <Text className="font-sans text-sm text-content-muted">
          {t('duration', { hours, minutes })}
        </Text>
      </View>

      {phases.length > 0 && (
        <View className="gap-2">
          <Text className="font-sans-medium text-xs uppercase tracking-[1px] text-content-faint">
            {t('phasesReached')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {phases.map((h) => (
              <View key={h} className="rounded-full border border-accent-deep bg-surface px-3 py-1">
                <Text className="font-sans-medium text-xs text-accent-bright">{h} h</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </GlassCard>
  );
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const { t } = useTranslation('journal');
  return (
    <GlassCard contentClassName="gap-3 p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="create-outline" size={16} color={colors.accent} />
          <Text className="font-sans-medium text-sm text-content">{t('noteTitle')}</Text>
        </View>
        <Text className="font-sans text-xs text-content-faint">{formatDate(entry.createdAt)}</Text>
      </View>
      {entry.mood !== null && <MoodDots value={entry.mood} />}
      {entry.tags.length > 0 && <TagChips tags={entry.tags} />}
      {entry.note !== null && (
        <Text className="font-serif text-base leading-6 text-content-muted">{entry.note}</Text>
      )}
    </GlassCard>
  );
}

/** Journal — nouvelle note (humeur + texte) et fil des jeûnes et ressentis sur 30 j. */
export default function JournalScreen() {
  const { t } = useTranslation('journal');
  const entries = useJournalStore((state) => state.entries);
  const sessions = useJournalStore((state) => state.sessions);
  const phasesBySession = useJournalStore((state) => state.phasesBySession);

  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<RessentiTag[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  // « Maintenant » figé au montage : le fil (fenêtre 30 j) ne dépend pas des re-renders.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void journalStore.getState().load();
  }, []);

  const feed = useMemo(() => buildJournalFeed(sessions, entries, now), [sessions, entries, now]);
  const correlation = useMemo(
    () => buildWellbeingCorrelation(sessions, entries),
    [sessions, entries],
  );

  const trimmedNote = note.trim();
  const canSave = mood !== null || tags.length > 0 || trimmedNote.length > 0;

  const toggleTag = (tag: RessentiTag) =>
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );

  const onSave = async () => {
    if (!canSave || saving) {
      return;
    }
    setSaving(true);
    try {
      await journalStore
        .getState()
        .addEntry({ mood, tags, note: trimmedNote.length > 0 ? trimmedNote : null });
      setMood(null);
      setTags([]);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AmbientBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View className="px-6 pb-2 pt-2">
          <Text className="font-serif-semibold text-2xl tracking-tight text-content">
            {t('title')}
          </Text>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 pb-10 pt-2">
          <GlassCard elevated contentClassName="gap-4 p-5">
            <Text className="font-sans-medium text-xs uppercase tracking-[2px] text-accent">
              {t('newEntry')}
            </Text>
            <Text className="font-serif text-sm text-content-muted">{t('moodLabel')}</Text>
            <MoodSelector value={mood} onChange={setMood} />
            <Text className="font-serif text-sm text-content-muted">{t('tagsLabel')}</Text>
            <TagSelector selected={tags} onToggle={toggleTag} />
            <TextInput
              accessibilityLabel={t('notePlaceholder')}
              value={note}
              onChangeText={setNote}
              placeholder={t('notePlaceholder')}
              placeholderTextColor={colors.contentFaint}
              multiline
              className="min-h-16 rounded-2xl border border-border bg-surface px-4 py-3 font-serif text-base leading-6 text-content"
            />
            <PressableScale onPress={onSave} disabled={!canSave || saving}>
              <View
                className="overflow-hidden rounded-2xl"
                style={{ opacity: canSave && !saving ? 1 : 0.5 }}
              >
                <LinearGradient
                  colors={[colors.accentBright, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View className="flex-row items-center justify-center gap-2 px-6 py-3">
                    <Ionicons name="add" size={18} color={colors.background} />
                    <Text className="font-sans-bold text-base text-background">{t('save')}</Text>
                  </View>
                </LinearGradient>
              </View>
            </PressableScale>
          </GlassCard>

          <WellbeingInsights correlation={correlation} />

          {feed.length === 0 ? (
            <Text className="py-6 text-center font-serif text-base leading-6 text-content-faint">
              {t('empty')}
            </Text>
          ) : (
            feed.map((item) =>
              item.kind === 'session' ? (
                <SessionCard
                  key={`s-${item.session.id}`}
                  session={item.session}
                  phases={phasesBySession[item.session.id] ?? []}
                />
              ) : (
                <EntryCard key={`e-${item.entry.id}`} entry={item.entry} />
              ),
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
