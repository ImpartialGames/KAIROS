import { filterLexicon, normalizeQuery } from '@/domain/lexicon-search';
import type { LexiconEntry } from '@/content/schema';

const entry = (over: Partial<LexiconEntry>): LexiconEntry => ({
  id: 'x',
  term: 'Terme',
  definition: 'Définition.',
  effetsCorps: null,
  effetsEsprit: null,
  timeline: null,
  source: 'lexique',
  ...over,
});

const entries: LexiconEntry[] = [
  entry({
    id: 'cetose',
    term: 'Cétose',
    definition: 'État métabolique de combustion des graisses.',
  }),
  entry({ id: 'autophagie', term: 'Autophagie', definition: 'Nettoyage cellulaire.' }),
  entry({ id: 'mtor', term: 'mTOR', definition: 'Kinase de la croissance cellulaire.' }),
];

describe('normalizeQuery', () => {
  it('retire accents, casse et espaces', () => {
    expect(normalizeQuery('  CÉTOSE ')).toBe('cetose');
    expect(normalizeQuery('Bêta')).toBe('beta');
  });
});

describe('filterLexicon', () => {
  it('requête vide → toutes les entrées (copie)', () => {
    const result = filterLexicon(entries, '   ');
    expect(result).toHaveLength(3);
    expect(result).not.toBe(entries);
  });

  it('trouve par terme, sans accent ni casse', () => {
    expect(filterLexicon(entries, 'cetose').map((e) => e.id)).toEqual(['cetose']);
    expect(filterLexicon(entries, 'MTOR').map((e) => e.id)).toEqual(['mtor']);
  });

  it('trouve par définition', () => {
    expect(filterLexicon(entries, 'cellulaire').map((e) => e.id)).toEqual(['autophagie', 'mtor']);
  });

  it('aucune correspondance → liste vide', () => {
    expect(filterLexicon(entries, 'zzz')).toEqual([]);
  });
});
