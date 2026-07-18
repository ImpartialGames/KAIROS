import { PhaseReachedSchema, RecordPhaseInputSchema } from '@/schemas/phase-reached';

const valid = () => ({
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  sessionId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  hours: 16,
  reachedAt: 1_700_000_000_000,
});

describe('PhaseReachedSchema', () => {
  it('accepte un jalon valide (palier 96h inclus)', () => {
    expect(PhaseReachedSchema.safeParse(valid()).success).toBe(true);
    expect(PhaseReachedSchema.safeParse({ ...valid(), hours: 96 }).success).toBe(true);
  });

  it.each([
    ['id non uuid', { id: 'x' }],
    ['sessionId non uuid', { sessionId: 'x' }],
    ['hours nul', { hours: 0 }],
    ['hours > 168', { hours: 169 }],
    ['hours non entier', { hours: 12.5 }],
    ['reachedAt nul', { reachedAt: 0 }],
  ])('rejette : %s', (_label, override) => {
    expect(PhaseReachedSchema.safeParse({ ...valid(), ...override }).success).toBe(false);
  });
});

describe('RecordPhaseInputSchema', () => {
  it('accepte une entrée sans id (généré par le repository)', () => {
    const { id: _id, ...input } = valid();
    expect(RecordPhaseInputSchema.safeParse(input).success).toBe(true);
  });
});
