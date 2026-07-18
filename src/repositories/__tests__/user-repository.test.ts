import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { createRepositories, type Repositories } from '@/repositories';

describe('SqliteUserRepository', () => {
  let db: TestDbClient;
  let repos: Repositories;

  beforeEach(async () => {
    db = await createTestDb();
    repos = createRepositories(db);
  });

  afterEach(() => {
    db.close();
  });

  it('getCurrent retourne null avant le premier lancement', async () => {
    await expect(repos.users.getCurrent()).resolves.toBeNull();
  });

  it('getOrCreateGuest crée un invité au premier appel', async () => {
    const user = await repos.users.getOrCreateGuest();
    expect(user.isGuest).toBe(true);
    expect(user.createdAt).toBeGreaterThan(0);
    expect(user.updatedAt).toBe(user.createdAt);
  });

  it("getOrCreateGuest est idempotent — c'est l'enregistrement qui sera mis à jour en Phase 1", async () => {
    const first = await repos.users.getOrCreateGuest();
    const second = await repos.users.getOrCreateGuest();
    const current = await repos.users.getCurrent();

    expect(second.id).toBe(first.id);
    expect(current?.id).toBe(first.id);

    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
    expect(count?.n).toBe(1);
  });
});
