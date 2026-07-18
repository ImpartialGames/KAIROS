import { z } from 'zod';

import { MAX_TARGET_HOURS } from '@/schemas/fast-session';

/**
 * Jalon biochimique atteint pendant une session (palier horaire : 12, 16, 18,
 * 24, 36, 48, 56, 72, 96 — voir docs-source/phases-jeune.md). La liste des
 * paliers vit dans le contenu (étape 5), pas dans le schéma : on valide ici
 * l'intégrité de la donnée, pas la liste éditoriale.
 */
export const PhaseReachedSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  hours: z.number().int().min(1).max(MAX_TARGET_HOURS),
  reachedAt: z.number().int().positive(),
});

export type PhaseReached = z.infer<typeof PhaseReachedSchema>;

export const RecordPhaseInputSchema = PhaseReachedSchema.omit({ id: true });
export type RecordPhaseInput = z.infer<typeof RecordPhaseInputSchema>;
