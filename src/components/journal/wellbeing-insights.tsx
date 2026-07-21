import { useTranslation } from 'react-i18next';

import { GlassCard } from '@/components/ui/glass-card';
import type { PhaseBand, WellbeingCorrelation } from '@/domain/wellbeing-correlation';
import { MOOD_MAX, type RessentiTag } from '@/schemas/journal-entry';
import { colors } from '@/theme/tokens';
import { Text, View } from '@/tw';

/** Deux ressentis les plus fréquents d'une bande (fréquence > 0), triés décroissant. */
function topTags(band: PhaseBand): { tag: RessentiTag; frequency: number }[] {
  return (Object.entries(band.tagFrequency) as [RessentiTag, number][])
    .filter(([, frequency]) => frequency > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([tag, frequency]) => ({ tag, frequency }));
}

/** Barre d'humeur moyenne (1–5) — proportion remplie en cuivre. */
function MoodBar({ value }: { value: number }) {
  return (
    <View className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
      <View
        className="h-full rounded-full"
        style={{ width: `${(value / MOOD_MAX) * 100}%`, backgroundColor: colors.accent }}
      />
    </View>
  );
}

function BandRow({ band }: { band: PhaseBand }) {
  const { t } = useTranslation('journal');
  const label = band.fromHours === 0 ? t('insightsBandBefore') : t('insightsBandFrom', { hours: band.fromHours });

  return (
    <View className="gap-2 border-t border-border pt-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-medium text-sm text-content">{label}</Text>
        <Text className="font-sans text-xs text-content-faint">
          {t('insightsEntries', { count: band.entryCount })}
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        {band.averageMood !== null ? (
          <>
            <MoodBar value={band.averageMood} />
            <Text className="font-sans-medium text-xs text-content-muted">
              {t('insightsMood', { value: band.averageMood.toFixed(1) })}
            </Text>
          </>
        ) : (
          <Text className="font-sans text-xs text-content-faint">{t('insightsNoMood')}</Text>
        )}
      </View>

      {topTags(band).length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {topTags(band).map(({ tag, frequency }) => (
            <View
              key={tag}
              className="flex-row items-center gap-1.5 rounded-full border border-accent-deep bg-surface px-3 py-1"
            >
              <Text className="font-sans-medium text-xs text-accent-bright">{t(`tag_${tag}`)}</Text>
              <Text className="font-sans text-xs text-content-faint">
                {t('insightsTagShare', { percent: Math.round(frequency * 100) })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Corrélation bien-être ↔ phase de jeûne (Phase 2). Rendu fonctionnel : pour
 * chaque palier renseigné, humeur moyenne + ressentis dominants. Masqué tant
 * qu'aucune note n'a été prise pendant un jeûne (rien à corréler).
 */
export function WellbeingInsights({ correlation }: { correlation: WellbeingCorrelation }) {
  const { t } = useTranslation('journal');
  if (correlation.contextualEntries === 0) {
    return null;
  }

  return (
    <GlassCard elevated contentClassName="gap-3 p-5">
      <View className="gap-1">
        <Text className="font-serif-semibold text-lg text-content">{t('insightsTitle')}</Text>
        <Text className="font-serif text-sm leading-5 text-content-muted">
          {t('insightsSubtitle')}
        </Text>
      </View>
      {correlation.bands.map((band) => (
        <BandRow key={band.fromHours} band={band} />
      ))}
    </GlassCard>
  );
}
