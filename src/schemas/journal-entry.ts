import { z } from 'zod';

export const MOOD_MIN = 1;
export const MOOD_MAX = 5;
export const NOTE_MAX_LENGTH = 2000;

/**
 * Vocabulaire contrôlé des ressentis (Phase 2) — trois positifs, trois négatifs,
 * ancrés sur les effets documentés du jeûne (clarté/énergie liées aux corps
 * cétoniques ; faim/irritabilité/maux de tête fréquents en début de jeûne). Sert
 * de base à la corrélation ressenti ↔ phase biochimique. Ne jamais réordonner ni
 * renommer une clé publiée : c'est elle qui est persistée (locale + cloud).
 */
export const RESSENTI_TAGS = [
  'clarte_mentale',
  'energie',
  'serenite',
  'faim',
  'irritabilite',
  'maux_de_tete',
] as const;
export type RessentiTag = (typeof RESSENTI_TAGS)[number];

const journalEntryShape = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  /** Rattachement optionnel à une session de jeûne (posé à la saisie si un jeûne est en cours). */
  sessionId: z.uuid().nullable(),
  /** Humeur globale 1-5. */
  mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).nullable(),
  /** Ressentis cochés (vocabulaire contrôlé), sans doublon. */
  tags: z.array(z.enum(RESSENTI_TAGS)).default([]),
  note: z.string().trim().min(1).max(NOTE_MAX_LENGTH).nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

/** Une entrée vide ne raconte rien : humeur, ressenti ou note — au moins un des trois. */
const hasContent = (e: { mood: number | null; tags: readonly string[]; note: string | null }) =>
  e.mood !== null || e.tags.length > 0 || e.note !== null;

export const JournalEntrySchema = journalEntryShape.refine(hasContent, {
  message: 'une entrée de journal requiert une humeur, un ressenti ou une note',
  path: ['mood'],
});

export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const CreateJournalEntryInputSchema = z
  .object({
    userId: z.uuid(),
    sessionId: z.uuid().nullable().default(null),
    mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).nullable().default(null),
    tags: z.array(z.enum(RESSENTI_TAGS)).default([]),
    note: z.string().trim().min(1).max(NOTE_MAX_LENGTH).nullable().default(null),
  })
  .refine(hasContent, {
    message: 'une entrée de journal requiert une humeur, un ressenti ou une note',
    path: ['mood'],
  });

export type CreateJournalEntryInput = z.input<typeof CreateJournalEntryInputSchema>;

/** Patch partiel — la cohérence (humeur/ressenti/note) est re-validée sur l'objet fusionné. */
export const UpdateJournalEntryInputSchema = z.object({
  mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).nullable().optional(),
  tags: z.array(z.enum(RESSENTI_TAGS)).optional(),
  note: z.string().trim().min(1).max(NOTE_MAX_LENGTH).nullable().optional(),
});

export type UpdateJournalEntryInput = z.infer<typeof UpdateJournalEntryInputSchema>;
