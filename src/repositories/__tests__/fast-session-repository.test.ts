import { randomUUID } from 'node:crypto';

import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { createRepositories, type Repositories } from '@/repositories';
import {
  ACTIVE_SESSION_ERROR,
  SESSION_NOT_FOUND_ERROR,
  SESSION_NOT_RUNNING_ERROR,
} from '@/repositories/sqlite/sqlite-fast-session-repository';

const HOUR = 3_600_000;
const T0 = 1_700_000_000_000;

describe('SqliteFastSessionRepository', () => {
  let db: TestDbClient;
  let repos: Repositories;
  let userId: string;
  let clock: number;

  beforeEach(async () => {
    db = await createTestDb();
    clock = T0;
    // Horloge injectée déterministe : chaque appel avance d'une seconde.
    repos = createRepositories(db, { newId: randomUUID, now: () => (clock += 1000) });
    userId = (await repos.users.getOrCreateGuest()).id;
  });

  afterEach(() => {
    db.close();
  });

  it('démarre une session 16:8 avec la durée cible dérivée', async () => {
    const session = await repos.fastSessions.start({ userId, protocol: '16:8' });

    expect(session.status).toBe('running');
    expect(session.targetHours).toBe(16);
    expect(session.endedAt).toBeNull();

    const active = await repos.fastSessions.getActive(userId);
    expect(active?.id).toBe(session.id);
  });

  it('respecte un démarrage rétroactif (startedAt explicite)', async () => {
    const startedAt = T0 - 8 * HOUR;
    const session = await repos.fastSessions.start({ userId, protocol: 'OMAD', startedAt });
    expect(session.startedAt).toBe(startedAt);
    expect(session.targetHours).toBe(23);
  });

  it('refuse une deuxième session en cours', async () => {
    await repos.fastSessions.start({ userId, protocol: '16:8' });
    await expect(repos.fastSessions.start({ userId, protocol: '18:6' })).rejects.toThrow(
      ACTIVE_SESSION_ERROR,
    );
  });

  it('rejette un custom sans targetHours (validation Zod en frontière de repo)', async () => {
    await expect(repos.fastSessions.start({ userId, protocol: 'custom' })).rejects.toThrow();
  });

  it('complete termine la session et libère la place', async () => {
    const session = await repos.fastSessions.start({ userId, protocol: '16:8' });
    const completed = await repos.fastSessions.complete(session.id, session.startedAt + 16 * HOUR);

    expect(completed.status).toBe('completed');
    expect(completed.endedAt).toBe(session.startedAt + 16 * HOUR);
    await expect(repos.fastSessions.getActive(userId)).resolves.toBeNull();

    // La place est libre : une nouvelle session peut démarrer.
    await expect(repos.fastSessions.start({ userId, protocol: '18:6' })).resolves.toBeDefined();
  });

  it('cancel marque la session abandonnée', async () => {
    const session = await repos.fastSessions.start({ userId, protocol: '20:4' });
    const cancelled = await repos.fastSessions.cancel(session.id, session.startedAt + HOUR);
    expect(cancelled.status).toBe('cancelled');
  });

  it('complete sur une session déjà terminée ou inconnue échoue explicitement', async () => {
    const session = await repos.fastSessions.start({ userId, protocol: '16:8' });
    await repos.fastSessions.complete(session.id, session.startedAt + 16 * HOUR);

    await expect(
      repos.fastSessions.complete(session.id, session.startedAt + 17 * HOUR),
    ).rejects.toThrow(SESSION_NOT_RUNNING_ERROR);
    await expect(repos.fastSessions.complete(randomUUID(), T0 + HOUR)).rejects.toThrow(
      SESSION_NOT_FOUND_ERROR,
    );
  });

  it('list trie par démarrage décroissant et applique limit/since', async () => {
    const starts = [T0 - 72 * HOUR, T0 - 48 * HOUR, T0 - 24 * HOUR];
    for (const startedAt of starts) {
      const s = await repos.fastSessions.start({ userId, protocol: '16:8', startedAt });
      await repos.fastSessions.complete(s.id, startedAt + 16 * HOUR);
    }

    const all = await repos.fastSessions.list(userId);
    expect(all.map((s) => s.startedAt)).toEqual([...starts].reverse());

    const limited = await repos.fastSessions.list(userId, { limit: 2 });
    expect(limited).toHaveLength(2);

    const recent = await repos.fastSessions.list(userId, { since: T0 - 50 * HOUR });
    expect(recent.map((s) => s.startedAt)).toEqual([T0 - 24 * HOUR, T0 - 48 * HOUR]);
  });

  describe('upsert (synchro descendante)', () => {
    it('insère une session complète telle quelle (id et timestamps préservés)', async () => {
      const id = randomUUID();
      await repos.fastSessions.upsert({
        id,
        userId,
        protocol: '18:6',
        targetHours: 18,
        status: 'completed',
        startedAt: T0,
        endedAt: T0 + 18 * HOUR,
        createdAt: T0,
        updatedAt: T0,
      });

      const stored = await repos.fastSessions.getById(id);
      expect(stored).toMatchObject({ id, status: 'completed', startedAt: T0, createdAt: T0 });
    });

    it('met à jour EN PLACE sans supprimer les paliers enfants (pas de CASCADE)', async () => {
      const session = await repos.fastSessions.start({
        userId,
        protocol: 'custom',
        targetHours: 24,
        startedAt: T0,
      });
      await repos.phasesReached.record({ sessionId: session.id, hours: 12, reachedAt: T0 + 12 * HOUR });

      // Clôture par upsert (même id, statut completed) — les paliers survivent.
      await repos.fastSessions.upsert({
        ...session,
        status: 'completed',
        endedAt: T0 + 16 * HOUR,
      });

      expect((await repos.fastSessions.getById(session.id))?.status).toBe('completed');
      expect(await repos.phasesReached.listBySession(session.id)).toHaveLength(1);
    });
  });
});
