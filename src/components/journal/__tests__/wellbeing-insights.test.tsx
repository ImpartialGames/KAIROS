import '@/i18n';

import { render, screen } from '@testing-library/react-native';

import { WellbeingInsights } from '@/components/journal/wellbeing-insights';
import type { WellbeingCorrelation } from '@/domain/wellbeing-correlation';
import { RESSENTI_TAGS, type RessentiTag } from '@/schemas/journal-entry';

const zeroTags = () =>
  Object.fromEntries(RESSENTI_TAGS.map((t) => [t, 0])) as Record<RessentiTag, number>;

describe('WellbeingInsights', () => {
  it('ne rend rien sans note contextualisée', () => {
    const empty: WellbeingCorrelation = { bands: [], contextualEntries: 0 };
    render(<WellbeingInsights correlation={empty} />);
    expect(screen.queryByText('Bien-être selon la phase')).toBeNull();
  });

  it('affiche les paliers, l’humeur moyenne et les ressentis dominants', () => {
    const correlation: WellbeingCorrelation = {
      contextualEntries: 3,
      bands: [
        {
          fromHours: 0,
          entryCount: 1,
          averageMood: 2,
          tagFrequency: { ...zeroTags(), faim: 1 },
        },
        {
          fromHours: 18,
          entryCount: 2,
          averageMood: 4.5,
          tagFrequency: { ...zeroTags(), clarte_mentale: 1 },
        },
      ],
    };

    render(<WellbeingInsights correlation={correlation} />);

    expect(screen.getByText('Bien-être selon la phase')).toBeOnTheScreen();
    expect(screen.getByText('Avant 12 h')).toBeOnTheScreen();
    expect(screen.getByText('Dès 18 h')).toBeOnTheScreen();
    expect(screen.getByText('Humeur 4.5/5')).toBeOnTheScreen();
    expect(screen.getByText('Clarté mentale')).toBeOnTheScreen();
    expect(screen.getByText('Faim')).toBeOnTheScreen();
  });

  it('affiche un constat quand un ressenti se détache en jeûne profond', () => {
    const correlation: WellbeingCorrelation = {
      contextualEntries: 5,
      bands: [
        { fromHours: 0, entryCount: 2, averageMood: 2, tagFrequency: { ...zeroTags(), faim: 1 } },
        {
          fromHours: 18,
          entryCount: 3,
          averageMood: 4,
          tagFrequency: { ...zeroTags(), clarte_mentale: 1 },
        },
      ],
    };

    render(<WellbeingInsights correlation={correlation} />);

    expect(
      screen.getByText('À partir de 18 h de jeûne, vous notez souvent : Clarté mentale.'),
    ).toBeOnTheScreen();
  });
});
