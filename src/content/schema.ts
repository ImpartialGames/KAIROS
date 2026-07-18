import { z } from 'zod';

/**
 * Schémas du contenu scientifique affiché dans l'app (lexique + timeline).
 * Le contenu est produit par le pipeline (scripts/generate-content.ts) à partir
 * de /docs-source, normalisé et curé, puis validé par ces schémas — à la
 * génération ET au chargement (src/content/index.ts).
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Une entrée du lexique scientifique. */
export const LexiconEntrySchema = z.object({
  id: z.string().regex(SLUG),
  term: z.string().min(1),
  definition: z.string().min(1),
  /** Effets « Corps » / « Esprit » du lexique — absents pour certaines entrées (ex. BDNF). */
  effetsCorps: z.string().min(1).nullable(),
  effetsEsprit: z.string().min(1).nullable(),
  /** Repères horaires en langage naturel — null si l'entrée n'en a pas. */
  timeline: z.string().min(1).nullable(),
  source: z.enum(['lexique', 'biochimie']),
});
export type LexiconEntry = z.infer<typeof LexiconEntrySchema>;

/** Un palier horaire de la timeline biochimique. */
export const TimelinePhaseSchema = z.object({
  hours: z.number().int().min(1).max(168),
  title: z.string().min(1),
  whatHappens: z.string().min(1),
  mechanisms: z.array(z.string().min(1)).min(1),
  benefitsBody: z.string().min(1),
  benefitsMind: z.string().min(1),
});
export type TimelinePhase = z.infer<typeof TimelinePhaseSchema>;

/** Une synergie entre deux mécanismes (angle éditorial « interactions »). */
export const SynergySchema = z.object({
  id: z.string().regex(SLUG),
  title: z.string().min(1),
  description: z.string().min(1),
});
export type Synergy = z.infer<typeof SynergySchema>;

export const ContentBundleSchema = z.object({
  lexicon: z.array(LexiconEntrySchema).min(1),
  timeline: z.array(TimelinePhaseSchema).min(1),
  synergies: z.array(SynergySchema).min(1),
});
export type ContentBundle = z.infer<typeof ContentBundleSchema>;
