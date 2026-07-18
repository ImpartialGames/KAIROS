import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { lexicon, synergies } from '@/content';
import type { LexiconEntry, Synergy } from '@/content/schema';
import { filterLexicon } from '@/domain/lexicon-search';
import { colors } from '@/theme/tokens';
import { ScrollView, Text, TextInput, View } from '@/tw';

/** Fiche d'un terme — définition et effets en serif éditoriale. */
function EntryCard({ entry }: { entry: LexiconEntry }) {
  const { t } = useTranslation('lexicon');

  return (
    <GlassCard contentClassName="gap-3 p-5">
      <Text className="font-serif-semibold text-xl tracking-tight text-content">{entry.term}</Text>
      <Text className="font-serif text-base leading-6 text-content-muted">{entry.definition}</Text>

      {entry.effetsCorps && (
        <View className="flex-row gap-2">
          <Ionicons name="body-outline" size={16} color={colors.accent} />
          <Text className="flex-1 font-serif text-sm leading-5 text-content-muted">
            <Text className="text-content">{t('body')}. </Text>
            {entry.effetsCorps}
          </Text>
        </View>
      )}
      {entry.effetsEsprit && (
        <View className="flex-row gap-2">
          <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
          <Text className="flex-1 font-serif text-sm leading-5 text-content-muted">
            <Text className="text-content">{t('mind')}. </Text>
            {entry.effetsEsprit}
          </Text>
        </View>
      )}
      {entry.timeline && (
        <View className="flex-row gap-2">
          <Ionicons name="time-outline" size={16} color={colors.cold} />
          <Text className="flex-1 font-sans text-xs leading-5" style={{ color: colors.cold }}>
            {entry.timeline}
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

function SynergyCard({ synergy }: { synergy: Synergy }) {
  return (
    <GlassCard contentClassName="gap-2 p-5">
      <Text className="font-sans-medium text-base tracking-tight text-accent">{synergy.title}</Text>
      <Text className="font-serif text-sm leading-5 text-content-muted">{synergy.description}</Text>
    </GlassCard>
  );
}

/** Lexique scientifique — 12 entrées cherchables + synergies entre mécanismes. */
export default function LexiconScreen() {
  const { t } = useTranslation('lexicon');
  const router = useRouter();
  const [query, setQuery] = useState('');

  const results = useMemo(() => filterLexicon(lexicon, query), [query]);
  const searching = query.trim().length > 0;

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

        <View className="px-6 pb-2 pt-1">
          <GlassCard contentClassName="flex-row items-center gap-3 px-4 py-3">
            <Ionicons name="search" size={18} color={colors.contentFaint} />
            <TextInput
              accessibilityLabel={t('searchPlaceholder')}
              value={query}
              onChangeText={setQuery}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={colors.contentFaint}
              autoCorrect={false}
              className="flex-1 font-sans text-base text-content"
            />
          </GlassCard>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 pb-10 pt-2">
          {!searching && (
            <Text className="font-serif text-base leading-6 text-content-muted">
              {t('subtitle')}
            </Text>
          )}

          {results.length === 0 ? (
            <Text className="py-8 text-center font-serif text-base text-content-faint">
              {t('empty')}
            </Text>
          ) : (
            results.map((entry) => <EntryCard key={entry.id} entry={entry} />)
          )}

          {!searching && (
            <View className="gap-4 pt-2">
              <View className="gap-1">
                <Text className="font-sans-medium text-xs uppercase tracking-[2px] text-accent">
                  {t('synergiesTitle')}
                </Text>
                <Text className="font-serif text-sm leading-5 text-content-faint">
                  {t('synergiesSubtitle')}
                </Text>
              </View>
              {synergies.map((synergy) => (
                <SynergyCard key={synergy.id} synergy={synergy} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
