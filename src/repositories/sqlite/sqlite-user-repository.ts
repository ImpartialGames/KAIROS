import type { DbClient } from '@/db/client';
import { defaultRepositoryDeps, type RepositoryDeps } from '@/repositories/deps';
import type { UserRepository } from '@/repositories/user-repository';
import { UserSchema, type User } from '@/schemas/user';

export const USER_NOT_FOUND_ERROR = 'Utilisateur introuvable';

interface UserRow {
  id: string;
  is_guest: number;
  auth_user_id: string | null;
  precautions_acknowledged_at: number | null;
  created_at: number;
  updated_at: number;
}

const toUser = (row: UserRow): User =>
  UserSchema.parse({
    id: row.id,
    isGuest: row.is_guest === 1,
    authUserId: row.auth_user_id,
    precautionsAcknowledgedAt: row.precautions_acknowledged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export class SqliteUserRepository implements UserRepository {
  constructor(
    private readonly db: DbClient,
    private readonly deps: RepositoryDeps = defaultRepositoryDeps,
  ) {}

  async getCurrent(): Promise<User | null> {
    const row = await this.db.getFirstAsync<UserRow>(
      'SELECT * FROM users ORDER BY created_at ASC LIMIT 1',
    );
    return row ? toUser(row) : null;
  }

  async getOrCreateGuest(): Promise<User> {
    const existing = await this.getCurrent();
    if (existing) {
      return existing;
    }

    const timestamp = this.deps.now();
    const id = this.deps.newId();
    await this.db.runAsync(
      'INSERT INTO users (id, is_guest, created_at, updated_at) VALUES (?, 1, ?, ?)',
      [id, timestamp, timestamp],
    );
    return toUser({
      id,
      is_guest: 1,
      auth_user_id: null,
      precautions_acknowledged_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  async convertGuestToRegistered(userId: string, authUserId: string): Promise<User> {
    // Mise à jour EN PLACE : même enregistrement, is_guest=0 + lien compte.
    // Les données locales (sessions, journal, paliers) gardent leur user_id
    // local — rien n'est déplacé ni recréé (CLAUDE.md, point critique).
    const result = await this.db.runAsync(
      'UPDATE users SET is_guest = 0, auth_user_id = ?, updated_at = ? WHERE id = ?',
      [authUserId, this.deps.now(), userId],
    );
    if (result.changes === 0) {
      throw new Error(USER_NOT_FOUND_ERROR);
    }

    const row = await this.db.getFirstAsync<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row) {
      throw new Error(USER_NOT_FOUND_ERROR);
    }
    return toUser(row);
  }

  async acknowledgePrecautions(userId: string, acknowledgedAt: number): Promise<User> {
    const result = await this.db.runAsync(
      'UPDATE users SET precautions_acknowledged_at = ?, updated_at = ? WHERE id = ?',
      [acknowledgedAt, this.deps.now(), userId],
    );
    if (result.changes === 0) {
      throw new Error(USER_NOT_FOUND_ERROR);
    }

    const row = await this.db.getFirstAsync<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row) {
      throw new Error(USER_NOT_FOUND_ERROR);
    }
    return toUser(row);
  }
}
