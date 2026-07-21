import { HOUR_MS } from '@/domain/fasting';
import {
  bandForElapsedHours,
  buildWellbeingCorrelation,
} from '@/domain/wellbeing-correlation';
import type { FastSession } from '@/schemas/fast-session';
import type { JournalEntry, RessentiTag } from '@/schemas/journal-entry';

const T0 = 1_700_000_000_000;
const SID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function session(over: Partial<FastSession> = {}): FastSession {
  return {
    id: SID,
    userId: 'u',
    protocol: 'custom',
    targetHours: 96,
    status: 'completed',
    startedAt: T0,
    endedAt: T0 + 96 * HOUR_MS,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  };
}

function entry(over: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: `e-${Math.round((over.createdAt ?? T0) - T0)}`,
    userId: 'u',
    sessionId: SID,
    mood: null,
    tags: [],
    note: null,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  };
}

/** Note à `hours` heures de jeûne, avec humeur et ressentis optionnels. */
function noteAtHours(hours: number, mood: number | null, tags: RessentiTag[]): JournalEntry {
  return entry({ createdAt: T0 + hours * HOUR_MS, mood, tags });
}

describe('bandForElapsedHours', () => {
  it.each([
    [0, 0],
    [5, 0],
    [11.9, 0],
    [12, 12],
    [13, 12],
    [18, 18],
    [23, 18],
    [24, 24],
    [100, 96],
  ])('%d h → palier %d', (hours, band) => {
    expect(bandForElapsedHours(hours)).toBe(band);
  });
});

describe('buildWellbeingCorrelation', () => {
  it('situe chaque note dans le palier de jeûne où elle a été prise', () => {
    const result = buildWellbeingCorrelation(
      [session()],
      [noteAtHours(4, 3, ['faim']), noteAtHours(19, 5, ['clarte_mentale'])],
    );

    expect(result.contextualEntries).toBe(2);
    expect(result.bands.map((b) => b.fromHours)).toEqual([0, 18]);
    expect(result.bands[0]?.tagFrequency.faim).toBe(1);
    expect(result.bands[1]?.tagFrequency.clarte_mentale).toBe(1);
  });

  it('calcule l’humeur moyenne uniquement sur les notes qui en portent une', () => {
    const result = buildWellbeingCorrelation(
      [session()],
      [noteAtHours(20, 4, []), noteAtHours(21, 2, []), noteAtHours(22, null, ['serenite'])],
    );

    const band = result.bands.find((b) => b.fromHours === 18);
    expect(band?.entryCount).toBe(3);
    expect(band?.averageMood).toBe(3); // (4 + 2) / 2, la note sans humeur exclue
    expect(band?.tagFrequency.serenite).toBeCloseTo(1 / 3);
  });

  it('ignore les notes hors jeûne (sessionId null)', () => {
    const result = buildWellbeingCorrelation(
      [session()],
      [entry({ sessionId: null, mood: 5 }), noteAtHours(13, 4, [])],
    );
    expect(result.contextualEntries).toBe(1);
    expect(result.bands.map((b) => b.fromHours)).toEqual([12]);
  });

  it('ignore les notes dont la session est absente du jeu de données', () => {
    const orphan = entry({ sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', mood: 3 });
    const result = buildWellbeingCorrelation([session()], [orphan]);
    expect(result.contextualEntries).toBe(0);
    expect(result.bands).toHaveLength(0);
  });

  it('borne un écart négatif à 0 (note antérieure au début théorique)', () => {
    const result = buildWellbeingCorrelation(
      [session()],
      [entry({ createdAt: T0 - HOUR_MS, mood: 3 })],
    );
    expect(result.bands[0]?.fromHours).toBe(0);
  });

  it('rend des bandes triées et n’expose que les paliers renseignés', () => {
    const result = buildWellbeingCorrelation(
      [session()],
      [noteAtHours(50, 4, []), noteAtHours(2, 2, []), noteAtHours(25, 3, [])],
    );
    expect(result.bands.map((b) => b.fromHours)).toEqual([0, 24, 48]);
  });

  it('sans note contextualisée, la corrélation est vide', () => {
    expect(buildWellbeingCorrelation([], [])).toEqual({ bands: [], contextualEntries: 0 });
  });
});
