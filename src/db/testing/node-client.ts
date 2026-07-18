import { DatabaseSync } from 'node:sqlite';

import type { DbClient, DbRunResult, SqlValue } from '@/db/client';

/**
 * Adaptateur DbClient au-dessus de node:sqlite (Node ≥ 24) — réservé aux tests.
 * Les repositories et migrations s'exécutent ainsi sur un vrai moteur SQLite
 * en mémoire, sans mock ni dépendance native supplémentaire.
 */
export interface TestDbClient extends DbClient {
  close(): void;
}

export function createNodeDbClient(path = ':memory:'): TestDbClient {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');

  return {
    async execAsync(sql: string): Promise<void> {
      db.exec(sql);
    },

    async runAsync(sql: string, params: SqlValue[] = []): Promise<DbRunResult> {
      const result = db.prepare(sql).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },

    async getFirstAsync<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },

    async getAllAsync<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[];
    },

    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },

    close(): void {
      db.close();
    },
  };
}
