import type { LexiconEntry } from '@/content/schema';

/** Normalise pour une recherche insensible à la casse et aux accents. */
export function normalizeQuery(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Filtre les entrées du lexique sur le terme et la définition (accents/casse
 * ignorés). Requête vide = toutes les entrées, dans l'ordre d'origine.
 */
export function filterLexicon(entries: readonly LexiconEntry[], query: string): LexiconEntry[] {
  const q = normalizeQuery(query);
  if (q.length === 0) {
    return [...entries];
  }
  return entries.filter(
    (entry) =>
      normalizeQuery(entry.term).includes(q) || normalizeQuery(entry.definition).includes(q),
  );
}
