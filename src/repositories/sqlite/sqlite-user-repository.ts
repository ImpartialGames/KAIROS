import type { DbClient } from '@/db/client';
import { defaultRepositoryDeps, type RepositoryDeps } from '@/repositories/deps';
import type { UserRepository } from '@/repositories/user-repository';
import { UserSchema, type User } from '@/schemas/user';

interface UserRow {
  id: string;
  is_guest: number;
  created_at: number;
  updated_at: number;
}

const toUser = (row: UserRow): User =>
  UserSchema.parse({
    id: row.id,
    isGuest: row.is_guest === 1,
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
    return toUser({ id, is_guest: 1, created_at: timestamp, updated_at: timestamp });
  }
}
