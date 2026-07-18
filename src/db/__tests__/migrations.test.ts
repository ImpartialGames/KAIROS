import { MIGRATIONS, migrate } from '@/db/migrations';
import { createNodeDbClient, type TestDbClient } from '@/db/testing/node-client';

const UUID_A = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const UUID_B = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const UUID_C = 'c3d4e5f6-a7b8-4c9d-8e0f-2a3b4c5d6e7f';
const NOW = 1_700_000_000_000;

describe('migrations', () => {
  let db: TestDbClient;

  beforeEach(async () => {
    db = createNodeDbClient();
    await migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  it('porte user_version au nombre de migrations', async () => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(MIGRATIONS.length);
  });

  it('crée les quatre tables du socle Phase 0', async () => {
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const names = tables.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['users', 'fast_sessions', 'phases_reached', 'journal_entries']),
    );
  });

  it('est idempotent (relancer migrate ne change rien)', async () => {
    await expect(migrate(db)).resolves.toBeUndefined();
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(MIGRATIONS.length);
  });

  it('applique les clés étrangères (session sans utilisateur rejetée)', async () => {
    await expect(
      db.runAsync(
        `INSERT INTO fast_sessions (id, user_id, protocol, target_hours, status, started_at, ended_at, created_at, updated_at)
         VALUES (?, ?, '16:8', 16, 'running', ?, NULL, ?, ?)`,
        [UUID_A, UUID_B, NOW, NOW, NOW],
      ),
    ).rejects.toThrow(/FOREIGN KEY/i);
  });

  it('garantit une seule session en cours par utilisateur (index partiel)', async () => {
    await db.runAsync(
      'INSERT INTO users (id, is_guest, created_at, updated_at) VALUES (?, 1, ?, ?)',
      [UUID_A, NOW, NOW],
    );
    const insertRunning = (id: string) =>
      db.runAsync(
        `INSERT INTO fast_sessions (id, user_id, protocol, target_hours, status, started_at, ended_at, created_at, updated_at)
         VALUES (?, ?, '16:8', 16, 'running', ?, NULL, ?, ?)`,
        [id, UUID_A, NOW, NOW, NOW],
      );

    await insertRunning(UUID_B);
    await expect(insertRunning(UUID_C)).rejects.toThrow(/UNIQUE/i);
  });

  it('refuse une session terminée sans ended_at (contrainte CHECK)', async () => {
    await db.runAsync(
      'INSERT INTO users (id, is_guest, created_at, updated_at) VALUES (?, 1, ?, ?)',
      [UUID_A, NOW, NOW],
    );
    await expect(
      db.runAsync(
        `INSERT INTO fast_sessions (id, user_id, protocol, target_hours, status, started_at, ended_at, created_at, updated_at)
         VALUES (?, ?, '16:8', 16, 'completed', ?, NULL, ?, ?)`,
        [UUID_B, UUID_A, NOW, NOW, NOW],
      ),
    ).rejects.toThrow(/CHECK/i);
  });
});
