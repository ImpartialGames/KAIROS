import { randomUUID } from 'node:crypto';

import { HOUR_MS } from '@/domain/fasting';
import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { migrateGuestToAccount } from '@/migration/guest-migration';
import { createRepositories, type Repositories } from '@/repositories';
import { FakeRemoteStore } from '@/sync/testing/fake-remote-store';

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const AUTH_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/**
 * Scénario critique CLAUDE.md : un invité génère des données, s'inscrit, et la
 * conversion doit se faire EN PLACE avec ZÉRO perte + upload cloud complet.
 */
describe('migrateGuestToAccount (invité → inscrit)', () => {
  let db: TestDbClient;
  let repos: Repositories;
  let remote: FakeRemoteStore;
  let guestId: string;
  let sessionA: string;

  beforeEach(async () => {
    db = await createTestDb();
    let clock = T0;
    repos = createRepositories(db, { newId: randomUUID, now: () => (clock += 1000) });
    remote = new FakeRemoteStore();

    const guest = await repos.users.getOrCreateGuest();
    guestId = guest.id;
    await repos.users.acknowledgePrecautions(guestId, T0 - 3 * DAY);

    // Données invité : 2 sessions terminées (dont une avec paliers) + 2 notes.
    const s1 = await repos.fastSessions.start({
      userId: guestId,
      protocol: 'custom',
      targetHours: 48,
      startedAt: T0 - 2 * DAY,
    });
    sessionA = s1.id;
    await repos.phasesReached.record({
      sessionId: s1.id,
      hours: 12,
      reachedAt: T0 - 2 * DAY + 12 * HOUR_MS,
    });
    await repos.phasesReached.record({
      sessionId: s1.id,
      hours: 16,
      reachedAt: T0 - 2 * DAY + 16 * HOUR_MS,
    });
    await repos.fastSessions.complete(s1.id, T0 - 2 * DAY + 16 * HOUR_MS);

    const s2 = await repos.fastSessions.start({
      userId: guestId,
      protocol: '18:6',
      startedAt: T0 - 1 * DAY,
    });
    await repos.fastSessions.complete(s2.id, T0 - 1 * DAY + 18 * HOUR_MS);

    await repos.journal.create({ userId: guestId, mood: 4, note: 'Clarté mentale.' });
    await repos.journal.create({ userId: guestId, sessionId: s1.id, note: 'Faim maîtrisée.' });
  });

  afterEach(() => {
    db.close();
  });

  it('convertit l’enregistrement invité EN PLACE (même id, jamais recréé)', async () => {
    await migrateGuestToAccount({
      repositories: repos,
      remote,
      localUserId: guestId,
      authUserId: AUTH_ID,
    });

    const user = await repos.users.getCurrent();
    expect(user?.id).toBe(guestId); // MÊME enregistrement
    expect(user?.isGuest).toBe(false);
    expect(user?.authUserId).toBe(AUTH_ID);

    // Un seul enregistrement local (rien n'a été recréé).
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
    expect(count?.n).toBe(1);
  });

  it('ne perd aucune donnée locale (sessions, paliers, notes intacts)', async () => {
    await migrateGuestToAccount({
      repositories: repos,
      remote,
      localUserId: guestId,
      authUserId: AUTH_ID,
    });

    // Les données locales gardent leur user_id local et restent lisibles.
    expect(await repos.fastSessions.list(guestId)).toHaveLength(2);
    expect(await repos.phasesReached.listBySession(sessionA)).toHaveLength(2);
    expect(await repos.journal.list(guestId)).toHaveLength(2);
  });

  it('téléverse tout dans le cloud sous le compte Supabase', async () => {
    await migrateGuestToAccount({
      repositories: repos,
      remote,
      localUserId: guestId,
      authUserId: AUTH_ID,
    });

    const profile = await remote.getProfile(AUTH_ID);
    expect(profile?.precautionsAcknowledgedAt).toBe(T0 - 3 * DAY);

    const cloudSessions = await remote.listFastSessions(AUTH_ID);
    expect(cloudSessions).toHaveLength(2);
    expect(cloudSessions.every((s) => s.userId === AUTH_ID)).toBe(true);

    expect(await remote.listPhasesReached(sessionA)).toHaveLength(2);

    const cloudEntries = await remote.listJournalEntries(AUTH_ID);
    expect(cloudEntries).toHaveLength(2);
    expect(cloudEntries.every((e) => e.userId === AUTH_ID)).toBe(true);
  });

  it('conserve les ids d’entités (mapping local↔cloud 1:1)', async () => {
    const localSessionIds = (await repos.fastSessions.list(guestId)).map((s) => s.id).sort();
    await migrateGuestToAccount({
      repositories: repos,
      remote,
      localUserId: guestId,
      authUserId: AUTH_ID,
    });
    const cloudSessionIds = (await remote.listFastSessions(AUTH_ID)).map((s) => s.id).sort();
    expect(cloudSessionIds).toEqual(localSessionIds);
  });

  it('est idempotente : un rejeu après interruption ne duplique rien', async () => {
    await migrateGuestToAccount({
      repositories: repos,
      remote,
      localUserId: guestId,
      authUserId: AUTH_ID,
    });
    await migrateGuestToAccount({
      repositories: repos,
      remote,
      localUserId: guestId,
      authUserId: AUTH_ID,
    });

    expect(await remote.listFastSessions(AUTH_ID)).toHaveLength(2);
    expect(await remote.listPhasesReached(sessionA)).toHaveLength(2);
    expect(await remote.listJournalEntries(AUTH_ID)).toHaveLength(2);

    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
    expect(count?.n).toBe(1);
  });

  it('échoue explicitement si l’enregistrement invité est introuvable', async () => {
    await expect(
      migrateGuestToAccount({
        repositories: repos,
        remote,
        localUserId: randomUUID(),
        authUserId: AUTH_ID,
      }),
    ).rejects.toThrow();
  });
});
