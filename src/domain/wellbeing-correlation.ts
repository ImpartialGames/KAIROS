/**
 * Corrélation bien-être ↔ phase biochimique (Phase 2, le différenciateur).
 *
 * Logique pure : à partir des notes de journal rattachées à un jeûne et des
 * sessions correspondantes, situe chaque ressenti dans la phase de jeûne où il a
 * été noté (heures écoulées = createdAt − session.startedAt), puis agrège par
 * palier. On répond ainsi à « note-t-on plus de clarté mentale à partir de 18 h ? »
 * sur les données réelles de l'utilisateur. Aucune dépendance DB/store.
 */
import { HOUR_MS, PHASE_MILESTONE_HOURS } from '@/domain/fasting';
import type { FastSession } from '@/schemas/fast-session';
import { RESSENTI_TAGS, type JournalEntry, type RessentiTag } from '@/schemas/journal-entry';

/** Début de chaque bande de corrélation : « avant 12 h » (0) puis les paliers. */
export const CORRELATION_BANDS = [0, ...PHASE_MILESTONE_HOURS] as const;

export interface PhaseBand {
  /** Heure de début de la bande (0 = avant le premier palier, 12 h). */
  fromHours: number;
  /** Nombre de notes situées dans cette bande. */
  entryCount: number;
  /** Humeur moyenne (1–5) des notes de la bande ; null si aucune humeur notée. */
  averageMood: number | null;
  /** Fréquence [0–1] de chaque ressenti parmi les notes de la bande. */
  tagFrequency: Record<RessentiTag, number>;
}

export interface WellbeingCorrelation {
  /** Bandes non vides, ordonnées par heure de début croissante. */
  bands: PhaseBand[];
  /** Total de notes situées dans un jeûne (donc dotées d'un contexte horaire). */
  contextualEntries: number;
}

/** Heures pleines de jeûne écoulées quand une note a été prise (bornées à ≥ 0). */
export function elapsedFastingHours(startedAt: number, createdAt: number): number {
  return Math.floor(Math.max(0, createdAt - startedAt) / HOUR_MS);
}

/** Palier de jeûne (heure de début de bande) atteint à `elapsedHours` ; 0 avant 12 h. */
export function bandForElapsedHours(elapsedHours: number): number {
  let band = 0;
  for (const milestone of PHASE_MILESTONE_HOURS) {
    if (elapsedHours >= milestone) {
      band = milestone;
    } else {
      break;
    }
  }
  return band;
}

const emptyTagCounts = (): Record<RessentiTag, number> =>
  Object.fromEntries(RESSENTI_TAGS.map((tag) => [tag, 0])) as Record<RessentiTag, number>;

interface BandAccumulator {
  entryCount: number;
  moodSum: number;
  moodCount: number;
  tagCounts: Record<RessentiTag, number>;
}

export function buildWellbeingCorrelation(
  sessions: readonly FastSession[],
  entries: readonly JournalEntry[],
): WellbeingCorrelation {
  const startedAtById = new Map(sessions.map((s) => [s.id, s.startedAt]));
  const accumulators = new Map<number, BandAccumulator>();
  let contextualEntries = 0;

  for (const entry of entries) {
    if (entry.sessionId === null) {
      continue; // note hors jeûne : aucun contexte horaire, hors corrélation.
    }
    const startedAt = startedAtById.get(entry.sessionId);
    if (startedAt === undefined) {
      continue; // session hors du jeu de données fourni.
    }

    const elapsedHours = Math.max(0, entry.createdAt - startedAt) / HOUR_MS;
    const band = bandForElapsedHours(elapsedHours);
    contextualEntries += 1;

    let acc = accumulators.get(band);
    if (!acc) {
      acc = { entryCount: 0, moodSum: 0, moodCount: 0, tagCounts: emptyTagCounts() };
      accumulators.set(band, acc);
    }
    acc.entryCount += 1;
    if (entry.mood !== null) {
      acc.moodSum += entry.mood;
      acc.moodCount += 1;
    }
    for (const tag of entry.tags) {
      acc.tagCounts[tag] += 1;
    }
  }

  const bands: PhaseBand[] = [...accumulators.entries()]
    .sort(([a], [b]) => a - b)
    .map(([fromHours, acc]) => ({
      fromHours,
      entryCount: acc.entryCount,
      averageMood: acc.moodCount > 0 ? acc.moodSum / acc.moodCount : null,
      tagFrequency: Object.fromEntries(
        RESSENTI_TAGS.map((tag) => [tag, acc.tagCounts[tag] / acc.entryCount]),
      ) as Record<RessentiTag, number>,
    }));

  return { bands, contextualEntries };
}

/** Seuil « jeûne profond » du headline — aligné sur l'exemple du cahier (18 h). */
export const INSIGHT_LATE_THRESHOLD_HOURS = 18;
/** Nombre minimal de notes en jeûne profond avant d'oser un constat. */
export const INSIGHT_MIN_LATE_ENTRIES = 3;
/** Le ressenti doit revenir dans au moins la moitié des notes tardives. */
export const INSIGHT_MIN_FREQUENCY = 0.5;
/** …et nettement plus souvent que tôt dans le jeûne (écart de fréquence). */
export const INSIGHT_MIN_LIFT = 1 / 3;

export interface RessentiInsight {
  tag: RessentiTag;
  /** Heure à partir de laquelle le constat s'applique (première bande tardive). */
  fromHours: number;
  lateFrequency: number;
}

/**
 * Constat marquant, honnête sur données minces : le ressenti nettement plus
 * fréquent en jeûne profond (≥ 18 h) qu'avant. Retourne null tant qu'il n'y a
 * pas assez de notes tardives, ou qu'aucun ressenti ne se détache — on ne
 * fabrique pas d'insight à partir de bruit. Sert la phrase type du cahier
 * (« plus de clarté mentale à partir de 18 h »).
 */
export function headlineInsight(correlation: WellbeingCorrelation): RessentiInsight | null {
  const late = correlation.bands.filter((b) => b.fromHours >= INSIGHT_LATE_THRESHOLD_HOURS);
  const early = correlation.bands.filter((b) => b.fromHours < INSIGHT_LATE_THRESHOLD_HOURS);

  const total = (bands: PhaseBand[]) => bands.reduce((n, b) => n + b.entryCount, 0);
  const lateCount = total(late);
  if (lateCount < INSIGHT_MIN_LATE_ENTRIES) {
    return null;
  }
  const earlyCount = total(early);

  // Fréquence pondérée d'un ressenti sur un ensemble de bandes (par le nombre de notes).
  const frequency = (bands: PhaseBand[], tag: RessentiTag, count: number) =>
    count === 0 ? 0 : bands.reduce((s, b) => s + b.tagFrequency[tag] * b.entryCount, 0) / count;

  let best: RessentiInsight | null = null;
  let bestLift = 0;
  for (const tag of RESSENTI_TAGS) {
    const lateFrequency = frequency(late, tag, lateCount);
    const lift = lateFrequency - frequency(early, tag, earlyCount);
    if (lateFrequency < INSIGHT_MIN_FREQUENCY || lift < INSIGHT_MIN_LIFT) {
      continue;
    }
    if (best === null || lift > bestLift) {
      bestLift = lift;
      best = { tag, fromHours: Math.min(...late.map((b) => b.fromHours)), lateFrequency };
    }
  }
  return best;
}
