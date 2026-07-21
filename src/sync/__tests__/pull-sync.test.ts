import { randomUUID } from 'node:crypto';

import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { HOUR_MS } from '@/domain/fasting';
import { createRepositories, type Repositories } from '@/repositories';
import { FastSessionSchema, type FastSession } from '@/schemas/fast-session';
import { JournalEntrySchema, type JournalEntry } from '@/schemas/journal-entry';
import { PhaseReachedSchema, type PhaseReached } from '@/schemas/phase-reached';
import type { User } from '@/schemas/user';
import { pullAccountToLocal } from '@/sync/pull-sync';
import { FakeRemoteStore } from '@/sync/testing/fake-remote-store';

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const AUTH_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Session cloud terminée par défaut, rattachée au compte (userId = AUTH_ID). */
function cloudSession(over: Partial<FastSession> = {}): FastSession {
  const status = over.status ?? 'completed';
  const startedAt = over.startedAt ?? T0;
  return FastSessionSchema.parse({
    id: over.id ?? randomUUID(),
    userId: AUTH_ID,
    protocol: '16:8',
    targetHours: 16,
    status,
    startedAt,
    endedAt: status === 'running' ? null : startedAt + 16 * HOUR_MS,
    createdAt: startedAt,
    updatedAt: startedAt,
  });
}

function cloudPhase(sessionId: string, hours: number): PhaseReached {
  return PhaseReachedSchema.parse({
    id: randomUUID(),
    sessionId,
    hours,
    reachedAt: T0 + hours * HOUR_MS,
  });
}

function cloudEntry(over: Partial<JournalEntry> = {}): JournalEntry {
  return JournalEntrySchema.parse({
    id: over.id ?? randomUUID(),
    userId: AUTH_ID,
    sessionId: over.sessionId ?? null,
    mood: over.mood ?? null,
    note: over.note ?? 'Note cloud.',
    createdAt: over.createdAt ?? T0,
    updatedAt: over.updatedAt ?? T0,
  });
}

describe('pullAccountToLocal (synchro descendante cloud → local)', () => {
  let db: TestDbClient;
  let repos: Repositories;
  let remote: FakeRemoteStore;
  let localUser: User;

  beforeEach(async () => {
    db = await createTestDb();
    let clock = T0;
    repos = createRepositories(db, { newId: randomUUID, now: () => (clock += 1000) });
    remote = new FakeRemoteStore();
    // Appareil « neuf » : invité local vierge, lié au compte (id local conservé).
    const guest = await repos.users.getOrCreateGuest();
    localUser = await repos.users.convertGuestToRegistered(guest.id, AUTH_ID);
  });

  afterEach(() => {
    db.close();
  });

  it('rapatrie sessions, paliers et notes avec le userId remappé en local', async () => {
    const s1 = cloudSession({ startedAt: T0 - 2 * DAY });
    const s2 = cloudSession({ startedAt: T0 - 1 * DAY });
    await remote.upsertFastSessions([s1, s2]);
    await remote.upsertPhasesReached([cloudPhase(s1.id, 12), cloudPhase(s1.id, 16)]);
    await remote.upsertJournalEntries([
      cloudEntry({ sessionId: s1.id, note: 'Rattachée.' }),
      cloudEntry({ mood: 4, note: null }),
    ]);

    const summary = await pullAccountToLocal({ repositories: repos, remote, localUser, authUserId: AUTH_ID });

    expect(summary).toEqual({ sessions: 2, phases: 2, entries: 2, skippedRunning: 0 });

    const localSessions = await repos.fastSessions.list(localUser.id);
    expect(localSessions).toHaveLength(2);
    // userId remappé sur l'enregistrement local, pas l'id du compte.
    expect(localSessions.every((s) => s.userId === localUser.id)).toBe(true);
    expect(localSessions.some((s) => s.id === s1.id)).toBe(true);

    expect(await repos.phasesReached.listBySession(s1.id)).toHaveLength(2);

    const localEntries = await repos.journal.list(localUser.id);
    expect(localEntries).toHaveLength(2);
    expect(localEntries.every((e) => e.userId === localUser.id)).toBe(true);
    expect(localEntries.some((e) => e.sessionId === s1.id)).toBe(true);
  });

  it('rapatrie l’accusé de précautions si le local ne l’a pas encore', async () => {
    await remote.upsertProfile({
      id: AUTH_ID,
      precautionsAcknowledgedAt: T0 - 5 * DAY,
      createdAt: T0 - 5 * DAY,
      updatedAt: T0 - 5 * DAY,
    });

    expect((await repos.users.getCurrent())?.precautionsAcknowledgedAt).toBeNull();
    await pullAccountToLocal({ repositories: repos, remote, localUser, authUserId: AUTH_ID });
    expect((await repos.users.getCurrent())?.precautionsAcknowledgedAt).toBe(T0 - 5 * DAY);
  });

  it('n’écrase pas un accusé de précautions local par un profil cloud vide', async () => {
    const acked = await repos.users.acknowledgePrecautions(localUser.id, T0 - DAY);
    await remote.upsertProfile({
      id: AUTH_ID,
      precautionsAcknowledgedAt: null,
      createdAt: T0,
      updatedAt: T0,
    });

    await pullAccountToLocal({
      repositories: repos,
      remote,
      localUser: acked,
      authUserId: AUTH_ID,
    });
    expect((await repos.users.getCurrent())?.precautionsAcknowledgedAt).toBe(T0 - DAY);
  });

  it('est idempotente : un second passage ne duplique rien', async () => {
    const s1 = cloudSession();
    await remote.upsertFastSessions([s1]);
    await remote.upsertPhasesReached([cloudPhase(s1.id, 12)]);
    await remote.upsertJournalEntries([cloudEntry({ sessionId: s1.id })]);

    await pullAccountToLocal({ repositories: repos, remote, localUser, authUserId: AUTH_ID });
    await pullAccountToLocal({ repositories: repos, remote, localUser, authUserId: AUTH_ID });

    expect(await repos.fastSessions.list(localUser.id)).toHaveLength(1);
    expect(await repos.phasesReached.listBySession(s1.id)).toHaveLength(1);
    expect(await repos.journal.list(localUser.id)).toHaveLength(1);
  });

  it('rapatrie un jeûne en cours du cloud quand l’appareil n’en a aucun', async () => {
    const running = cloudSession({ status: 'running', startedAt: T0 - 3 * HOUR_MS });
    await remote.upsertFastSessions([running]);

    const summary = await pullAccountToLocal({
      repositories: repos,
      remote,
      localUser,
      authUserId: AUTH_ID,
    });

    expect(summary.skippedRunning).toBe(0);
    const active = await repos.fastSessions.getActive(localUser.id);
    expect(active?.id).toBe(running.id);
  });

  it('protège le jeûne actif de l’appareil : le running cloud est ignoré, l’actif local intact', async () => {
    // Actif local (autre id) avec un palier déjà enregistré.
    const localActive = await repos.fastSessions.start({
      userId: localUser.id,
      protocol: 'custom',
      targetHours: 24,
      startedAt: T0 - 2 * HOUR_MS,
    });
    await repos.phasesReached.record({ sessionId: localActive.id, hours: 1, reachedAt: T0 - HOUR_MS });

    const cloudRunning = cloudSession({ status: 'running', startedAt: T0 - 5 * HOUR_MS });
    // Une note cloud rattachée à ce running ignoré → doit être rapatriée détachée.
    await remote.upsertFastSessions([cloudRunning]);
    await remote.upsertJournalEntries([cloudEntry({ sessionId: cloudRunning.id, note: 'Orpheline.' })]);

    const summary = await pullAccountToLocal({
      repositories: repos,
      remote,
      localUser,
      authUserId: AUTH_ID,
    });

    expect(summary.skippedRunning).toBe(1);

    // L'actif local n'a pas bougé et garde son palier (aucun CASCADE destructeur).
    const active = await repos.fastSessions.getActive(localUser.id);
    expect(active?.id).toBe(localActive.id);
    expect(await repos.phasesReached.listBySession(localActive.id)).toHaveLength(1);

    // La note orpheline est rapatriée, mais détachée (sessionId null).
    const entries = await repos.journal.list(localUser.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.sessionId).toBeNull();
  });

  it('met à jour en place une session déjà locale terminée entre-temps ailleurs', async () => {
    // L'appareil connaît la session comme « en cours » (rattachée en local)…
    const local = await repos.fastSessions.start({
      userId: localUser.id,
      protocol: 'custom',
      targetHours: 24,
      startedAt: T0 - 4 * HOUR_MS,
    });
    expect((await repos.fastSessions.getActive(localUser.id))?.id).toBe(local.id);

    // …le cloud la connaît désormais terminée (même id, userId = compte).
    const completed = FastSessionSchema.parse({
      ...local,
      userId: AUTH_ID,
      status: 'completed',
      endedAt: T0,
      updatedAt: T0,
    });
    await remote.upsertFastSessions([completed]);

    await pullAccountToLocal({ repositories: repos, remote, localUser, authUserId: AUTH_ID });

    expect(await repos.fastSessions.getActive(localUser.id)).toBeNull();
    expect((await repos.fastSessions.getById(local.id))?.status).toBe('completed');
  });
});
