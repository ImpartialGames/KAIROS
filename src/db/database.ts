import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { DbClient, SqlValue } from '@/db/client';
import { migrate } from '@/db/migrations';

export const DATABASE_NAME = 'kairos.db';

/** Adapte expo-sqlite au contrat DbClient (params toujours fournis, résultat normalisé). */
function toDbClient(db: SQLiteDatabase): DbClient {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params: SqlValue[] = []) => {
      const result = await db.runAsync(sql, params);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
    },
    getFirstAsync: (sql, params: SqlValue[] = []) => db.getFirstAsync(sql, params),
    getAllAsync: (sql, params: SqlValue[] = []) => db.getAllAsync(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

let dbPromise: Promise<DbClient> | null = null;

async function open(): Promise<DbClient> {
  const raw = await openDatabaseAsync(DATABASE_NAME);
  await raw.execAsync('PRAGMA foreign_keys = ON');
  await raw.execAsync('PRAGMA journal_mode = WAL');
  const db = toDbClient(raw);
  await migrate(db);
  return db;
}

/** Base locale unique de l'app, migrée à l'ouverture (singleton). */
export function getDatabase(): Promise<DbClient> {
  dbPromise ??= open();
  return dbPromise;
}
