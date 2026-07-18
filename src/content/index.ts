import generated from '@/content/generated/content.json';
import { ContentBundleSchema } from '@/content/schema';

/**
 * Contenu scientifique de l'app (lexique + timeline + synergies), validé par
 * Zod au chargement. Produit par `npm run generate:content` depuis /docs-source
 * — ne jamais éditer content.json à la main.
 */
export const content = ContentBundleSchema.parse(generated);

export const lexicon = content.lexicon;
export const timeline = content.timeline;
export const synergies = content.synergies;

export const lexiconById = new Map(lexicon.map((entry) => [entry.id, entry]));
export const timelineByHours = new Map(timeline.map((phase) => [phase.hours, phase]));
