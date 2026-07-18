import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { APP_NOT_READY_ERROR, createAppStore, selectNeedsPrecautions } from '@/stores/app-store';

/**
 * Tests d'intégration du premier lancement (mode invité) : store réel,
 * repositories réels, SQLite réel en mémoire — seul getDb est injecté.
 */
describe('app-store (intégration premier lancement)', () => {
  let db: TestDbClient;

  const newStore = () => createAppStore({ getDb: async () => db });

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('crée un enregistrement invité unique au premier lancement', async () => {
    const store = newStore();
    await store.getState().bootstrap();

    const { status, user } = store.getState();
    expect(status).toBe('ready');
    expect(user?.isGuest).toBe(true);

    // bootstrap idempotent : pas de deuxième invité.
    await store.getState().bootstrap();
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
    expect(count?.n).toBe(1);
  });

  it("rattache les données créées (session, journal) à l'invité", async () => {
    const store = newStore();
    await store.getState().bootstrap();
    const { repositories, user } = store.getState();

    const session = await repositories!.fastSessions.start({
      userId: user!.id,
      protocol: '16:8',
    });
    const entry = await repositories!.journal.create({
      userId: user!.id,
      sessionId: session.id,
      mood: 4,
    });

    expect(session.userId).toBe(user!.id);
    expect(entry.userId).toBe(user!.id);
    expect(entry.sessionId).toBe(session.id);
  });

  it('retrouve le même invité à la relance (nouveau store, même base)', async () => {
    const first = newStore();
    await first.getState().bootstrap();

    const second = newStore();
    await second.getState().bootstrap();

    expect(second.getState().user?.id).toBe(first.getState().user?.id);
  });

  it('exige les précautions une seule fois : acceptées, puis plus jamais — même après relance', async () => {
    const store = newStore();
    await store.getState().bootstrap();
    expect(selectNeedsPrecautions(store.getState())).toBe(true);

    await store.getState().acknowledgePrecautions();

    const { user } = store.getState();
    expect(user?.precautionsAcknowledgedAt).toBeGreaterThan(0);
    expect(selectNeedsPrecautions(store.getState())).toBe(false);

    // Relance simulée : l'acceptation est persistée avec l'invité.
    const relaunched = newStore();
    await relaunched.getState().bootstrap();
    expect(selectNeedsPrecautions(relaunched.getState())).toBe(false);
  });

  it('passe en erreur si la base est indisponible, sans crash', async () => {
    const store = createAppStore({
      getDb: async () => {
        throw new Error('base indisponible');
      },
    });
    await store.getState().bootstrap();

    expect(store.getState().status).toBe('error');
    expect(store.getState().error).toContain('base indisponible');
  });

  it("refuse d'accepter les précautions avant le bootstrap", async () => {
    const store = newStore();
    await expect(store.getState().acknowledgePrecautions()).rejects.toThrow(APP_NOT_READY_ERROR);
  });
});
