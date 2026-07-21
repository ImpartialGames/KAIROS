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
