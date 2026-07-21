import { randomUUID } from 'node:crypto';

import { HOUR_MS } from '@/domain/fasting';
import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { createAppStore } from '@/stores/app-store';
import { createJournalStore, JOURNAL_APP_NOT_READY_ERROR } from '@/stores/journal-store';

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;

/**
 * Intégration journal ↔ repositories sur SQLite réel : seul l'accès DB et
 * l'horloge sont injectés.
 */
describe('journal-store (intégration)', () => {
  let db: TestDbClient;
  let appStore: ReturnType<typeof createAppStore>;
  let clock: { now: number };

  const newJournalStore = () =>
    createJournalStore({
      getApp: () => {
        const { repositories, user } = appStore.getState();
        return { repositories, user };
      },
      now: () => clock.now,
    });

  beforeEach(async () => {
    db = await createTestDb();
    clock = { now: T0 };
    appStore = createAppStore({
      getDb: async () => db,
      now: () => clock.now,
      repositoryDeps: { newId: randomUUID, now: () => clock.now },
    });
    await appStore.getState().bootstrap();
    await appStore.getState().acknowledgePrecautions();
  });

  afterEach(() => {
    db.close();
  });

  it('addEntry crée une note et la place en tête', async () => {
    const store = newJournalStore();
    await store.getState().addEntry({ mood: 4, tags: [], note: 'Belle clarté mentale.' });
    await store.getState().addEntry({ mood: null, tags: [], note: 'Petite faim à 14 h.' });

    const [first, second] = store.getState().entries;
    expect(first?.note).toBe('Petite faim à 14 h.');
    expect(second?.mood).toBe(4);
  });

  it('addEntry rattache la note au jeûne en cours (contexte de corrélation)', async () => {
    const repos = appStore.getState().repositories!;
    const userId = appStore.getState().user!.id;
    const active = await repos.fastSessions.start({
      userId,
      protocol: '16:8',
      startedAt: T0 - 3 * HOUR_MS,
    });

    const store = newJournalStore();
    await store.getState().addEntry({ mood: 4, tags: ['clarte_mentale'], note: null });

    const [entry] = store.getState().entries;
    expect(entry?.sessionId).toBe(active.id);
    expect(entry?.tags).toEqual(['clarte_mentale']);
  });

  it('addEntry hors jeûne laisse la note détachée (sessionId null)', async () => {
    const store = newJournalStore();
    await store.getState().addEntry({ mood: null, tags: ['faim'], note: null });
    expect(store.getState().entries[0]?.sessionId).toBeNull();
  });

  it('load agrège sessions terminées (+ paliers) et notes de la fenêtre', async () => {
    const repos = appStore.getState().repositories!;
    const userId = appStore.getState().user!.id;

    const session = await repos.fastSessions.start({
      userId,
      protocol: 'custom',
      targetHours: 48,
      startedAt: T0 - 2 * DAY,
    });
    await repos.phasesReached.record({
      sessionId: session.id,
      hours: 12,
      reachedAt: T0 - 2 * DAY + 12 * HOUR_MS,
    });
    await repos.fastSessions.complete(session.id, T0 - 2 * DAY + 16 * HOUR_MS);

    const store = newJournalStore();
    await store.getState().addEntry({ mood: 3, tags: [], note: 'Note du jour.' });
    await store.getState().load();

    const state = store.getState();
    expect(state.loaded).toBe(true);
    expect(state.sessions).toHaveLength(1);
    expect(state.phasesBySession[session.id]).toEqual([12]);
    expect(state.entries).toHaveLength(1);
  });

  it('load ignore une session encore en cours', async () => {
    const repos = appStore.getState().repositories!;
    const userId = appStore.getState().user!.id;
    await repos.fastSessions.start({ userId, protocol: '16:8', startedAt: T0 - HOUR_MS });

    const store = newJournalStore();
    await store.getState().load();

    expect(store.getState().sessions).toHaveLength(0);
  });

  it('addEntry avant le bootstrap échoue explicitement', async () => {
    const store = createJournalStore({
      getApp: () => ({ repositories: null, user: null }),
    });
    await expect(store.getState().addEntry({ mood: 3, tags: [], note: null })).rejects.toThrow(
      JOURNAL_APP_NOT_READY_ERROR,
    );
  });
});
