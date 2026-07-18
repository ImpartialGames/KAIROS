import {
  ContentBundleSchema,
  type LexiconEntry,
  type Synergy,
  type TimelinePhase,
} from '@/content/schema';

const entry = (id: string): LexiconEntry => ({
  id,
  term: id,
  definition: 'Définition.',
  effetsCorps: null,
  effetsEsprit: null,
  timeline: null,
  source: 'lexique',
});

const phase = (hours: number): TimelinePhase => ({
  hours,
  title: `${hours} heures`,
  whatHappens: 'Ce qui se passe.',
  mechanisms: ['un mécanisme'],
  benefitsBody: 'Corps.',
  benefitsMind: 'Esprit.',
});

const synergy = (id: string): Synergy => ({ id, title: id, description: 'Description.' });

const bundle = () => ({
  lexicon: [entry('cetose'), entry('autophagie')],
  timeline: [phase(12), phase(16)],
  synergies: [synergy('a-b'), synergy('c-d')],
});

describe('ContentBundleSchema — unicité des clés', () => {
  it('accepte un bundle sans doublon', () => {
    expect(ContentBundleSchema.safeParse(bundle()).success).toBe(true);
  });

  it('rejette un id de lexique en double', () => {
    const b = bundle();
    b.lexicon[1] = entry('cetose');
    expect(ContentBundleSchema.safeParse(b).success).toBe(false);
  });

  it('rejette un palier de timeline en double', () => {
    const b = bundle();
    b.timeline[1] = phase(12);
    expect(ContentBundleSchema.safeParse(b).success).toBe(false);
  });

  it('rejette un id de synergie en double', () => {
    const b = bundle();
    b.synergies[1] = synergy('a-b');
    expect(ContentBundleSchema.safeParse(b).success).toBe(false);
  });
});
