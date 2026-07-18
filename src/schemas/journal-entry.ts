import { z } from 'zod';

export const MOOD_MIN = 1;
export const MOOD_MAX = 5;
export const NOTE_MAX_LENGTH = 2000;

const journalEntryShape = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  /** Rattachement optionnel à une session de jeûne. */
  sessionId: z.uuid().nullable(),
  /** Humeur 1-5 — esquisse Phase 0, enrichie en Phase 2 (corrélation biochimie). */
  mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).nullable(),
  note: z.string().trim().min(1).max(NOTE_MAX_LENGTH).nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

/** Une entrée vide ne raconte rien : humeur ou note, au moins l'une des deux. */
const hasContent = (e: { mood: number | null; note: string | null }) =>
  e.mood !== null || e.note !== null;

export const JournalEntrySchema = journalEntryShape.refine(hasContent, {
  message: 'une entrée de journal requiert une humeur ou une note',
  path: ['mood'],
});

export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const CreateJournalEntryInputSchema = z
  .object({
    userId: z.uuid(),
    sessionId: z.uuid().nullable().default(null),
    mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).nullable().default(null),
    note: z.string().trim().min(1).max(NOTE_MAX_LENGTH).nullable().default(null),
  })
  .refine(hasContent, {
    message: 'une entrée de journal requiert une humeur ou une note',
    path: ['mood'],
  });

export type CreateJournalEntryInput = z.input<typeof CreateJournalEntryInputSchema>;

/** Patch partiel — la cohérence (humeur ou note) est re-validée sur l'objet fusionné. */
export const UpdateJournalEntryInputSchema = z.object({
  mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).nullable().optional(),
  note: z.string().trim().min(1).max(NOTE_MAX_LENGTH).nullable().optional(),
});

export type UpdateJournalEntryInput = z.infer<typeof UpdateJournalEntryInputSchema>;
