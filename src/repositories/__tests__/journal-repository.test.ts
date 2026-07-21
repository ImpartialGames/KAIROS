import { randomUUID } from 'node:crypto';

import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { createRepositories, type Repositories } from '@/repositories';
import { JOURNAL_ENTRY_NOT_FOUND_ERROR } from '@/repositories/sqlite/sqlite-journal-repository';

const T0 = 1_700_000_000_000;

describe('SqliteJournalRepository', () => {
  let db: TestDbClient;
  let repos: Repositories;
  let userId: string;
  let clock: number;

  beforeEach(async () => {
    db = await createTestDb();
    clock = T0;
    repos = createRepositories(db, { newId: randomUUID, now: () => (clock += 1000) });
    userId = (await repos.users.getOrCreateGuest()).id;
  });

  afterEach(() => {
    db.close();
  });

  it('crée une entrée humeur seule, note seule, et trime la note', async () => {
    const moodOnly = await repos.journal.create({ userId, mood: 3 });
    expect(moodOnly.mood).toBe(3);
    expect(moodOnly.note).toBeNull();

    const noteOnly = await repos.journal.create({ userId, note: '  Faim maîtrisée.  ' });
    expect(noteOnly.mood).toBeNull();
    expect(noteOnly.note).toBe('Faim maîtrisée.');
  });

  it('rejette une entrée sans humeur ni note', async () => {
    await expect(repos.journal.create({ userId })).rejects.toThrow();
  });

  it('met à jour via patch partiel en revalidant l’entrée fusionnée', async () => {
    const entry = await repos.journal.create({ userId, mood: 2 });

    const patched = await repos.journal.update(entry.id, { note: 'Regain d’énergie à 18h.' });
    expect(patched.mood).toBe(2);
    expect(patched.note).toBe('Regain d’énergie à 18h.');
    expect(patched.updatedAt).toBeGreaterThan(entry.updatedAt);

    // Vider l'humeur alors que la note est null → entrée vide interdite.
    const noteless = await repos.journal.create({ userId, mood: 4 });
    await expect(repos.journal.update(noteless.id, { mood: null })).rejects.toThrow();
  });

  it('update/remove sur une entrée inconnue échouent explicitement', async () => {
    await expect(repos.journal.update(randomUUID(), { mood: 3 })).rejects.toThrow(
      JOURNAL_ENTRY_NOT_FOUND_ERROR,
    );
    await expect(repos.journal.remove(randomUUID())).rejects.toThrow(JOURNAL_ENTRY_NOT_FOUND_ERROR);
  });

  it('remove supprime définitivement', async () => {
    const entry = await repos.journal.create({ userId, note: 'à supprimer' });
    await repos.journal.remove(entry.id);
    await expect(repos.journal.getById(entry.id)).resolves.toBeNull();
  });

  it('liste en ordre antéchronologique avec limit et pagination before', async () => {
    const first = await repos.journal.create({ userId, note: 'entrée 1' });
    const second = await repos.journal.create({ userId, note: 'entrée 2' });
    const third = await repos.journal.create({ userId, note: 'entrée 3' });

    const all = await repos.journal.list(userId);
    expect(all.map((e) => e.id)).toEqual([third.id, second.id, first.id]);

    const limited = await repos.journal.list(userId, { limit: 1 });
    expect(limited.map((e) => e.id)).toEqual([third.id]);

    const page = await repos.journal.list(userId, { before: second.createdAt });
    expect(page.map((e) => e.id)).toEqual([first.id]);
  });

  it('persiste et relit les ressentis (tags JSON)', async () => {
    const created = await repos.journal.create({
      userId,
      tags: ['clarte_mentale', 'faim'],
      note: 'Tête claire malgré la faim.',
    });
    expect(created.tags).toEqual(['clarte_mentale', 'faim']);

    const reloaded = await repos.journal.getById(created.id);
    expect(reloaded?.tags).toEqual(['clarte_mentale', 'faim']);
  });

  it('met à jour les ressentis sans toucher au reste', async () => {
    const created = await repos.journal.create({ userId, mood: 3, tags: ['faim'] });
    const updated = await repos.journal.update(created.id, { tags: ['energie', 'serenite'] });
    expect(updated.tags).toEqual(['energie', 'serenite']);
    expect(updated.mood).toBe(3);
  });

  it('détache l’entrée de sa session supprimée (ON DELETE SET NULL)', async () => {
    const session = await repos.fastSessions.start({ userId, protocol: '16:8' });
    const entry = await repos.journal.create({
      userId,
      sessionId: session.id,
      note: 'pendant le jeûne',
    });
    expect(entry.sessionId).toBe(session.id);

    await db.runAsync('DELETE FROM fast_sessions WHERE id = ?', [session.id]);

    const detached = await repos.journal.getById(entry.id);
    expect(detached?.sessionId).toBeNull();
    expect(detached?.note).toBe('pendant le jeûne');
  });
});
