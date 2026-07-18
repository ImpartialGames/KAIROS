/**
 * Logique pure du jeûne : paliers biochimiques horaires, temps écoulé/restant,
 * progression. Aucune dépendance — testable sans store ni DB.
 *
 * Les paliers reprennent la timeline de docs-source/phases-jeune.md ;
 * leur contenu éditorial (mécanismes, bienfaits) arrive avec le pipeline
 * de contenu (étape 5), seuls les horaires vivent ici.
 */
export const PHASE_MILESTONE_HOURS = [12, 16, 18, 24, 36, 48, 56, 72, 96] as const;
export type MilestoneHours = (typeof PHASE_MILESTONE_HOURS)[number];

export const HOUR_MS = 3_600_000;

/** Instant théorique (ms epoch) où un palier est franchi pour une session. */
export function milestoneTimeMs(startedAt: number, hours: number): number {
  return startedAt + hours * HOUR_MS;
}

/** Paliers déjà franchis à l'instant `now` (bord inclus : 12h pile = franchi). */
export function crossedMilestones(startedAt: number, now: number): MilestoneHours[] {
  return PHASE_MILESTONE_HOURS.filter((hours) => now >= milestoneTimeMs(startedAt, hours));
}

/** Prochain palier à venir, null si le dernier (96h) est dépassé. */
export function nextMilestone(startedAt: number, now: number): MilestoneHours | null {
  return PHASE_MILESTONE_HOURS.find((hours) => now < milestoneTimeMs(startedAt, hours)) ?? null;
}

export function elapsedMs(startedAt: number, now: number): number {
  return Math.max(0, now - startedAt);
}

/** Temps restant jusqu'à l'objectif — négatif une fois l'objectif dépassé. */
export function remainingMs(startedAt: number, targetHours: number, now: number): number {
  return milestoneTimeMs(startedAt, targetHours) - now;
}

/** Progression vers l'objectif, bornée à [0, 1]. */
export function progressRatio(startedAt: number, targetHours: number, now: number): number {
  const ratio = elapsedMs(startedAt, now) / (targetHours * HOUR_MS);
  return Math.min(1, Math.max(0, ratio));
}

/** Durée au format HH:MM:SS (heures non bornées : 120:00:00 possible). */
export function formatHms(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
