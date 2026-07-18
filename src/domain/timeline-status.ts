import { crossedMilestones, nextMilestone } from '@/domain/fasting';

/**
 * État d'un palier de la timeline vis-à-vis de la session en cours.
 * - past    : palier franchi, antérieur à l'état actuel
 * - current : plus grand palier franchi = l'état biologique du moment
 * - next    : prochain palier à atteindre
 * - future  : au-delà du prochain
 * - neutral : aucune session en cours (mode éducatif)
 */
export type PhaseStatus = 'neutral' | 'past' | 'current' | 'next' | 'future';

/**
 * La cétose s'amorce vers 16 h (docs-source/phases-jeune.md). Avant ce seuil,
 * la timeline utilise l'accent froid ; à partir de là, l'accent cuivre — pour
 * distinguer visuellement « avant cétose » et « après cétose » (cahier des charges §3).
 */
export const KETOSIS_ONSET_HOURS = 16;

export function isPreKetosis(hours: number): boolean {
  return hours < KETOSIS_ONSET_HOURS;
}

export interface TimelineContext {
  /** Début de la session (ms epoch). */
  startedAt: number;
  /** Instant courant (ms epoch). */
  now: number;
}

/**
 * Fabrique un lecteur d'état par palier. Sans contexte (aucune session),
 * tout est 'neutral'. L'état ne dépend que du temps écoulé, pas de l'objectif :
 * le corps franchit 12 h à 12 h même si la cible était plus courte.
 */
export function makePhaseStatus(context: TimelineContext | null): (hours: number) => PhaseStatus {
  if (context === null) {
    return () => 'neutral';
  }

  const crossed = crossedMilestones(context.startedAt, context.now);
  const current = crossed.length > 0 ? Math.max(...crossed) : null;
  const upcoming = nextMilestone(context.startedAt, context.now);

  return (hours) => {
    if (hours === current) {
      return 'current';
    }
    if (crossed.includes(hours as (typeof crossed)[number])) {
      return 'past';
    }
    if (hours === upcoming) {
      return 'next';
    }
    return 'future';
  };
}
