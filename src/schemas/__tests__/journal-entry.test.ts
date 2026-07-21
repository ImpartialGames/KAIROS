import {
  CreateJournalEntryInputSchema,
  JournalEntrySchema,
  NOTE_MAX_LENGTH,
  UpdateJournalEntryInputSchema,
} from '@/schemas/journal-entry';

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const valid = () => ({
  id: 'c3d4e5f6-a7b8-4c9d-8e0f-2a3b4c5d6e7f',
  userId: USER_ID,
  sessionId: null,
  mood: 4,
  note: 'Clarté mentale nette en fin de journée.',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
});

describe('JournalEntrySchema', () => {
  it('accepte une entrée avec humeur et note', () => {
    expect(JournalEntrySchema.safeParse(valid()).success).toBe(true);
  });

  it('accepte humeur seule ou note seule', () => {
    expect(JournalEntrySchema.safeParse({ ...valid(), note: null }).success).toBe(true);
    expect(JournalEntrySchema.safeParse({ ...valid(), mood: null }).success).toBe(true);
  });

  it('défaut tags = [] quand le champ est absent', () => {
    const result = JournalEntrySchema.safeParse(valid());
    expect(result.success && result.data.tags).toEqual([]);
  });

  it('accepte une entrée avec des ressentis seuls (ni humeur ni note)', () => {
    const result = JournalEntrySchema.safeParse({
      ...valid(),
      mood: null,
      note: null,
      tags: ['clarte_mentale', 'energie'],
    });
    expect(result.success).toBe(true);
  });

  it('rejette un ressenti hors vocabulaire', () => {
    expect(JournalEntrySchema.safeParse({ ...valid(), tags: ['inconnu'] }).success).toBe(false);
  });

  it.each([
    ['id non uuid', { id: 'x' }],
    ['userId non uuid', { userId: 'x' }],
    ['sessionId non uuid', { sessionId: 'x' }],
    ['mood < 1', { mood: 0 }],
    ['mood > 5', { mood: 6 }],
    ['mood non entier', { mood: 2.5 }],
    ['note vide', { note: '' }],
    ['note uniquement des espaces', { note: '   ' }],
    ['note trop longue', { note: 'a'.repeat(NOTE_MAX_LENGTH + 1) }],
    ['humeur ET note absentes', { mood: null, note: null }],
    ['createdAt nul', { createdAt: 0 }],
    ['updatedAt négatif', { updatedAt: -1 }],
  ])('rejette : %s', (_label, override) => {
    expect(JournalEntrySchema.safeParse({ ...valid(), ...override }).success).toBe(false);
  });
});

describe('CreateJournalEntryInputSchema', () => {
  it('applique les défauts (sessionId/mood/note null) et garde la note trimée', () => {
    const result = CreateJournalEntryInputSchema.safeParse({
      userId: USER_ID,
      note: '  du texte  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ sessionId: null, mood: null, note: 'du texte', tags: [] });
    }
  });

  it('accepte des ressentis seuls (sans humeur ni note)', () => {
    const result = CreateJournalEntryInputSchema.safeParse({
      userId: USER_ID,
      tags: ['serenite'],
    });
    expect(result.success).toBe(true);
  });

  it('rejette une entrée sans humeur, ni note, ni ressenti', () => {
    expect(CreateJournalEntryInputSchema.safeParse({ userId: USER_ID }).success).toBe(false);
  });
});

describe('UpdateJournalEntryInputSchema', () => {
  it('accepte un patch partiel', () => {
    expect(UpdateJournalEntryInputSchema.safeParse({ mood: 2 }).success).toBe(true);
    expect(UpdateJournalEntryInputSchema.safeParse({}).success).toBe(true);
  });

  it.each([
    ['mood hors bornes', { mood: 6 }],
    ['note vide', { note: '' }],
  ])('rejette : %s', (_label, patch) => {
    expect(UpdateJournalEntryInputSchema.safeParse(patch).success).toBe(false);
  });
});
