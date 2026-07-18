import { randomUUID } from 'node:crypto';

import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { createRepositories, type Repositories } from '@/repositories';
import { PHASE_SESSION_NOT_FOUND_ERROR } from '@/repositories/sqlite/sqlite-phase-reached-repository';

const HOUR = 3_600_000;
const T0 = 1_700_000_000_000;

describe('SqlitePhaseReachedRepository', () => {
  let db: TestDbClient;
  let repos: Repositories;
  let sessionId: string;

  beforeEach(async () => {
    db = await createTestDb();
    repos = createRepositories(db);
    const userId = (await repos.users.getOrCreateGuest()).id;
    sessionId = (await repos.fastSessions.start({ userId, protocol: 'custom', targetHours: 96 }))
      .id;
  });

  afterEach(() => {
    db.close();
  });

  it('enregistre un jalon et le relit', async () => {
    const phase = await repos.phasesReached.record({ sessionId, hours: 16, reachedAt: T0 });
    expect(phase.hours).toBe(16);
    expect(phase.sessionId).toBe(sessionId);
  });

  it('est idempotent sur un même palier (aucun doublon)', async () => {
    const first = await repos.phasesReached.record({ sessionId, hours: 18, reachedAt: T0 });
    const second = await repos.phasesReached.record({
      sessionId,
      hours: 18,
      reachedAt: T0 + HOUR,
    });

    expect(second.id).toBe(first.id);
    expect(second.reachedAt).toBe(T0);
    await expect(repos.phasesReached.listBySession(sessionId)).resolves.toHaveLength(1);
  });

  it('liste les jalons triés par palier croissant', async () => {
    await repos.phasesReached.record({ sessionId, hours: 24, reachedAt: T0 + 24 * HOUR });
    await repos.phasesReached.record({ sessionId, hours: 12, reachedAt: T0 + 12 * HOUR });
    await repos.phasesReached.record({ sessionId, hours: 16, reachedAt: T0 + 16 * HOUR });

    const phases = await repos.phasesReached.listBySession(sessionId);
    expect(phases.map((p) => p.hours)).toEqual([12, 16, 24]);
  });

  it('refuse un jalon sur une session inexistante', async () => {
    await expect(
      repos.phasesReached.record({ sessionId: randomUUID(), hours: 12, reachedAt: T0 }),
    ).rejects.toThrow(PHASE_SESSION_NOT_FOUND_ERROR);
  });

  it('supprime les jalons avec leur session (ON DELETE CASCADE)', async () => {
    await repos.phasesReached.record({ sessionId, hours: 12, reachedAt: T0 });
    await db.runAsync('DELETE FROM fast_sessions WHERE id = ?', [sessionId]);
    await expect(repos.phasesReached.listBySession(sessionId)).resolves.toHaveLength(0);
  });
});
