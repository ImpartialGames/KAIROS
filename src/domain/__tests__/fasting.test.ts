import {
  crossedMilestones,
  elapsedMs,
  formatHms,
  HOUR_MS,
  milestoneTimeMs,
  nextMilestone,
  PHASE_MILESTONE_HOURS,
  progressRatio,
  remainingMs,
} from '@/domain/fasting';

const T0 = 1_700_000_000_000;

describe('paliers biochimiques', () => {
  it('reprend les 9 paliers de phases-jeune.md, triés', () => {
    expect(PHASE_MILESTONE_HOURS).toEqual([12, 16, 18, 24, 36, 48, 56, 72, 96]);
  });

  it('crossedMilestones inclut le bord exact (12h pile = franchi)', () => {
    expect(crossedMilestones(T0, T0 + 12 * HOUR_MS)).toEqual([12]);
    expect(crossedMilestones(T0, T0 + 12 * HOUR_MS - 1)).toEqual([]);
  });

  it('crossedMilestones cumule les paliers franchis', () => {
    expect(crossedMilestones(T0, T0 + 17 * HOUR_MS)).toEqual([12, 16]);
    expect(crossedMilestones(T0, T0 + 200 * HOUR_MS)).toEqual([...PHASE_MILESTONE_HOURS]);
  });

  it('nextMilestone retourne le prochain palier, puis null après 96h', () => {
    expect(nextMilestone(T0, T0)).toBe(12);
    expect(nextMilestone(T0, T0 + 12 * HOUR_MS)).toBe(16);
    expect(nextMilestone(T0, T0 + 96 * HOUR_MS)).toBeNull();
  });

  it('milestoneTimeMs donne l’instant biologique théorique', () => {
    expect(milestoneTimeMs(T0, 18)).toBe(T0 + 18 * HOUR_MS);
  });
});

describe('temps et progression', () => {
  it('elapsedMs ne descend jamais sous zéro (horloge décalée)', () => {
    expect(elapsedMs(T0, T0 - 5_000)).toBe(0);
    expect(elapsedMs(T0, T0 + 5_000)).toBe(5_000);
  });

  it('remainingMs devient négatif après l’objectif', () => {
    expect(remainingMs(T0, 16, T0 + 15 * HOUR_MS)).toBe(HOUR_MS);
    expect(remainingMs(T0, 16, T0 + 17 * HOUR_MS)).toBe(-HOUR_MS);
  });

  it('progressRatio est borné à [0, 1]', () => {
    expect(progressRatio(T0, 16, T0)).toBe(0);
    expect(progressRatio(T0, 16, T0 + 8 * HOUR_MS)).toBeCloseTo(0.5);
    expect(progressRatio(T0, 16, T0 + 32 * HOUR_MS)).toBe(1);
    expect(progressRatio(T0, 16, T0 - HOUR_MS)).toBe(0);
  });
});

describe('formatHms', () => {
  it.each([
    [0, '00:00:00'],
    [59_000, '00:00:59'],
    [16 * HOUR_MS, '16:00:00'],
    [16 * HOUR_MS + 4 * 60_000 + 32_000, '16:04:32'],
    [120 * HOUR_MS, '120:00:00'],
    [-5_000, '00:00:00'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatHms(ms)).toBe(expected);
  });
});
