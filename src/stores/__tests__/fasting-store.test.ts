import { randomUUID } from 'node:crypto';

import { HOUR_MS } from '@/domain/fasting';
import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { ACTIVE_SESSION_ERROR } from '@/repositories/sqlite/sqlite-fast-session-repository';
import { createAppStore } from '@/stores/app-store';
import {
  createFastingStore,
  NO_ACTIVE_SESSION_ERROR,
  PRECAUTIONS_REQUIRED_ERROR,
} from '@/stores/fasting-store';

const T0 = 1_700_000_000_000;

/**
 * Intégration timer ↔ repositories sur SQLite réel : seul l'accès DB, l'horloge
 * et les notifications (effet de bord natif) sont injectés.
 */
describe('fasting-store (intégration)', () => {
  let db: TestDbClient;
  let appStore: ReturnType<typeof createAppStore>;
  let clock: { now: number };
  let notifications: {
    scheduleMilestones: jest.Mock;
    cancelMilestones: jest.Mock;
  };

  const newFastingStore = () =>
    createFastingStore({
      getApp: () => {
        const { repositories, user } = appStore.getState();
        return { repositories, user };
      },
      now: () => clock.now,
      notifications,
    });

  beforeEach(async () => {
    db = await createTestDb();
    clock = { now: T0 };
    notifications = {
      scheduleMilestones: jest.fn(async () => undefined),
      cancelMilestones: jest.fn(async () => undefined),
    };
    appStore = createAppStore({
      getDb: async () => db,
      now: () => clock.now,
      // L'horloge des repositories doit suivre l'horloge du test (startedAt, endedAt).
      repositoryDeps: { newId: randomUUID, now: () => clock.now },
    });
    await appStore.getState().bootstrap();
  });

  afterEach(() => {
    db.close();
  });

  it('refuse de démarrer tant que les précautions ne sont pas acceptées', async () => {
    const store = newFastingStore();
    await expect(store.getState().startFast({ protocol: '16:8' })).rejects.toThrow(
      PRECAUTIONS_REQUIRED_ERROR,
    );
    // Rien n'a été créé ni planifié.
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM fast_sessions');
    expect(count?.n).toBe(0);
    expect(notifications.scheduleMilestones).not.toHaveBeenCalled();
  });

  it('démarre après acceptation : session persistée + notifications planifiées', async () => {
    await appStore.getState().acknowledgePrecautions();
    const store = newFastingStore();

    await store.getState().startFast({ protocol: '16:8' });

    const { activeSession } = store.getState();
    expect(activeSession?.status).toBe('running');
    expect(activeSession?.targetHours).toBe(16);
    expect(notifications.scheduleMilestones).toHaveBeenCalledWith(activeSession);

    // Persistée : relisible depuis la base.
    const persisted = await appStore
      .getState()
      .repositories!.fastSessions.getActive(appStore.getState().user!.id);
    expect(persisted?.id).toBe(activeSession?.id);

    // Une seule session à la fois (erreur repo propagée).
    await expect(store.getState().startFast({ protocol: '18:6' })).rejects.toThrow(
      ACTIVE_SESSION_ERROR,
    );
  });

  it('démarre même si la planification des notifications échoue (best-effort)', async () => {
    await appStore.getState().acknowledgePrecautions();
    notifications.scheduleMilestones.mockRejectedValueOnce(new Error('notifs indisponibles'));
    const store = newFastingStore();

    await expect(store.getState().startFast({ protocol: '16:8' })).resolves.toBeUndefined();
    expect(store.getState().activeSession?.status).toBe('running');
  });

  it('enregistre les paliers franchis au fil du temps, sans doublon', async () => {
    await appStore.getState().acknowledgePrecautions();
    const store = newFastingStore();
    await store.getState().startFast({ protocol: 'custom', targetHours: 48 });
    const sessionId = store.getState().activeSession!.id;

    clock.now = T0 + 17 * HOUR_MS;
    await store.getState().syncMilestones();
    expect(store.getState().reachedHours).toEqual([12, 16]);

    // Re-sync au même instant : idempotent.
    await store.getState().syncMilestones();
    const phases = await appStore.getState().repositories!.phasesReached.listBySession(sessionId);
    expect(phases.map((p) => p.hours)).toEqual([12, 16]);
    // reachedAt = instant biologique théorique (startedAt + palier).
    expect(phases[0]?.reachedAt).toBe(T0 + 12 * HOUR_MS);
  });

  it('rattrape à la relance les paliers manqués app fermée', async () => {
    await appStore.getState().acknowledgePrecautions();
    const store = newFastingStore();
    await store.getState().startFast({ protocol: 'custom', targetHours: 96 });
    const sessionId = store.getState().activeSession!.id;

    // L'app se ferme, 25h passent, relance : nouveau store.
    clock.now = T0 + 25 * HOUR_MS;
    const relaunched = newFastingStore();
    await relaunched.getState().hydrate();

    expect(relaunched.getState().activeSession?.id).toBe(sessionId);
    expect(relaunched.getState().reachedHours).toEqual([12, 16, 18, 24]);

    const phases = await appStore.getState().repositories!.phasesReached.listBySession(sessionId);
    expect(phases.map((p) => p.hours)).toEqual([12, 16, 18, 24]);
  });

  it('complete : paliers de dernière minute comptés, notifications annulées, place libérée', async () => {
    await appStore.getState().acknowledgePrecautions();
    const store = newFastingStore();
    await store.getState().startFast({ protocol: '16:8' });
    const session = store.getState().activeSession!;

    clock.now = T0 + 16 * HOUR_MS + 30 * 60_000; // terminé à 16h30
    await store.getState().completeFast();

    expect(store.getState().activeSession).toBeNull();
    expect(notifications.cancelMilestones).toHaveBeenCalledWith(session);

    const repos = appStore.getState().repositories!;
    const completed = await repos.fastSessions.getById(session.id);
    expect(completed?.status).toBe('completed');
    // 12h et 16h franchis avant la fin → enregistrés même sans tick UI.
    const phases = await repos.phasesReached.listBySession(session.id);
    expect(phases.map((p) => p.hours)).toEqual([12, 16]);

    // La place est libre pour une nouvelle session.
    await expect(store.getState().startFast({ protocol: '18:6' })).resolves.toBeUndefined();
  });

  it('cancel : session abandonnée, notifications annulées', async () => {
    await appStore.getState().acknowledgePrecautions();
    const store = newFastingStore();
    await store.getState().startFast({ protocol: '20:4' });
    const session = store.getState().activeSession!;

    clock.now = T0 + 2 * HOUR_MS;
    await store.getState().cancelFast();

    expect(store.getState().activeSession).toBeNull();
    expect(notifications.cancelMilestones).toHaveBeenCalledWith(session);
    const cancelled = await appStore.getState().repositories!.fastSessions.getById(session.id);
    expect(cancelled?.status).toBe('cancelled');
  });

  it('clôture avec une horloge qui a reculé sous le début : session valide, pas d’empoisonnement', async () => {
    await appStore.getState().acknowledgePrecautions();
    const store = newFastingStore();
    await store.getState().startFast({ protocol: '16:8' });
    const session = store.getState().activeSession!;

    // Correction NTP : l'horloge recule sous le début du jeûne.
    clock.now = session.startedAt - HOUR_MS;
    await expect(store.getState().completeFast()).resolves.toBeUndefined();

    // endedAt borné au début (durée nulle) → session valide, store bien vidé.
    expect(store.getState().activeSession).toBeNull();
    const repos = appStore.getState().repositories!;
    const completed = await repos.fastSessions.getById(session.id);
    expect(completed?.status).toBe('completed');
    expect(completed?.endedAt).toBe(session.startedAt);

    // La liste ne plante pas : aucune ligne empoisonnée qui ferait échouer tout list().
    await expect(repos.fastSessions.list(session.userId)).resolves.toHaveLength(1);
  });

  it('complete/cancel sans session en cours échouent explicitement', async () => {
    const store = newFastingStore();
    await expect(store.getState().completeFast()).rejects.toThrow(NO_ACTIVE_SESSION_ERROR);
    await expect(store.getState().cancelFast()).rejects.toThrow(NO_ACTIVE_SESSION_ERROR);
  });
});
