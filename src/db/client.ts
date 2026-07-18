/**
 * Contrat minimal d'accès SQLite, satisfait structurellement par
 * `expo-sqlite` (runtime app) et par l'adaptateur node:sqlite (tests).
 * Les repositories ne dépendent que de cette interface — c'est elle
 * qu'un backend Supabase remplacera en Phase 1, pas les appels SQL épars.
 */
export type SqlValue = string | number | null;

export interface DbRunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface DbClient {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlValue[]): Promise<DbRunResult>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
