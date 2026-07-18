import { HOUR_MS, PHASE_MILESTONE_HOURS } from '@/domain/fasting';
import { isPreKetosis, KETOSIS_ONSET_HOURS, makePhaseStatus } from '@/domain/timeline-status';

const T0 = 1_700_000_000_000;
const statusesAt = (elapsedHours: number) => {
  const at = makePhaseStatus({ startedAt: T0, now: T0 + elapsedHours * HOUR_MS });
  return PHASE_MILESTONE_HOURS.map((hours) => [hours, at(hours)] as const);
};

describe('isPreKetosis', () => {
  it('sépare avant/après cétose au seuil de 16 h', () => {
    expect(KETOSIS_ONSET_HOURS).toBe(16);
    expect(isPreKetosis(12)).toBe(true);
    expect(isPreKetosis(16)).toBe(false);
    expect(isPreKetosis(24)).toBe(false);
  });
});

describe('makePhaseStatus', () => {
  it('sans session : tout est neutre (mode éducatif)', () => {
    const at = makePhaseStatus(null);
    for (const hours of PHASE_MILESTONE_HOURS) {
      expect(at(hours)).toBe('neutral');
    }
  });

  it('session fraîche (2 h) : 12 h est le prochain, le reste à venir', () => {
    const map = new Map(statusesAt(2));
    expect(map.get(12)).toBe('next');
    expect(map.get(16)).toBe('future');
    expect(map.get(96)).toBe('future');
    expect([...map.values()]).not.toContain('current');
  });

  it('à 20 h : 12/16 atteints, 18 actuel, 24 prochain', () => {
    const map = new Map(statusesAt(20));
    expect(map.get(12)).toBe('past');
    expect(map.get(16)).toBe('past');
    expect(map.get(18)).toBe('current');
    expect(map.get(24)).toBe('next');
    expect(map.get(36)).toBe('future');
  });

  it('au palier exact (16 h pile) : 16 h devient l’état actuel', () => {
    const map = new Map(statusesAt(16));
    expect(map.get(16)).toBe('current');
    expect(map.get(12)).toBe('past');
    expect(map.get(18)).toBe('next');
  });

  it('au-delà de 96 h : 96 actuel, aucun prochain', () => {
    const map = new Map(statusesAt(120));
    expect(map.get(96)).toBe('current');
    expect(map.get(72)).toBe('past');
    expect([...map.values()]).not.toContain('next');
    expect([...map.values()]).not.toContain('future');
  });
});
