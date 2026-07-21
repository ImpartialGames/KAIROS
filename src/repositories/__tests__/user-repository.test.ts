import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { createRepositories, type Repositories } from '@/repositories';
import { USER_NOT_FOUND_ERROR } from '@/repositories/sqlite/sqlite-user-repository';

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
    expect(user.authUserId).toBeNull();
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

  it("acknowledgePrecautions persiste l'acceptation sur l'enregistrement invité", async () => {
    const guest = await repos.users.getOrCreateGuest();
    expect(guest.precautionsAcknowledgedAt).toBeNull();

    const acknowledgedAt = guest.createdAt + 60_000;
    const updated = await repos.users.acknowledgePrecautions(guest.id, acknowledgedAt);

    expect(updated.id).toBe(guest.id);
    expect(updated.precautionsAcknowledgedAt).toBe(acknowledgedAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(guest.updatedAt);

    // Persisté : relu depuis la base, pas seulement en mémoire.
    const reread = await repos.users.getCurrent();
    expect(reread?.precautionsAcknowledgedAt).toBe(acknowledgedAt);
  });

  it('acknowledgePrecautions échoue sur un utilisateur inconnu', async () => {
    await expect(
      repos.users.acknowledgePrecautions('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 1_700_000_000_000),
    ).rejects.toThrow(USER_NOT_FOUND_ERROR);
  });

  it('convertGuestToRegistered met à jour EN PLACE (même id, is_guest=0, lien compte)', async () => {
    const guest = await repos.users.getOrCreateGuest();
    const authUserId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

    const converted = await repos.users.convertGuestToRegistered(guest.id, authUserId);

    expect(converted.id).toBe(guest.id); // même enregistrement
    expect(converted.isGuest).toBe(false);
    expect(converted.authUserId).toBe(authUserId);

    // Persisté, et toujours un seul enregistrement (rien recréé).
    const reread = await repos.users.getCurrent();
    expect(reread?.isGuest).toBe(false);
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
    expect(count?.n).toBe(1);
  });

  it('convertGuestToRegistered échoue sur un utilisateur inconnu', async () => {
    await expect(
      repos.users.convertGuestToRegistered(
        'c3d4e5f6-a7b8-4c9d-8e0f-2a3b4c5d6e7f',
        'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      ),
    ).rejects.toThrow(USER_NOT_FOUND_ERROR);
  });
});
