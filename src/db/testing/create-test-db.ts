import { migrate } from '@/db/migrations';
import { createNodeDbClient, type TestDbClient } from '@/db/testing/node-client';

/** Base SQLite réelle en mémoire, migrée au schéma courant — pour les tests. */
export async function createTestDb(): Promise<TestDbClient> {
  const db = createNodeDbClient();
  await migrate(db);
  return db;
}
