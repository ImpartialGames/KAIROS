import type { DbClient } from '@/db/client';
import { sqlErrorMessage } from '@/db/sql-error';
import { defaultRepositoryDeps, type RepositoryDeps } from '@/repositories/deps';
import type {
  FastSessionListOptions,
  FastSessionRepository,
} from '@/repositories/fast-session-repository';
import {
  FastSessionSchema,
  resolveTargetHours,
  StartFastSessionInputSchema,
  type FastSession,
  type FastSessionStatus,
  type StartFastSessionInput,
} from '@/schemas/fast-session';

export const ACTIVE_SESSION_ERROR = 'Une session de jeûne est déjà en cours';
export const SESSION_NOT_FOUND_ERROR = 'Session de jeûne introuvable';
export const SESSION_NOT_RUNNING_ERROR = 'La session de jeûne n’est plus en cours';

const DEFAULT_LIST_LIMIT = 50;

interface FastSessionRow {
  id: string;
  user_id: string;
  protocol: string;
  target_hours: number;
  status: string;
  started_at: number;
  ended_at: number | null;
  created_at: number;
  updated_at: number;
}

const toFastSession = (row: FastSessionRow): FastSession =>
  FastSessionSchema.parse({
    id: row.id,
    userId: row.user_id,
    protocol: row.protocol,
    targetHours: row.target_hours,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export class SqliteFastSessionRepository implements FastSessionRepository {
  constructor(
    private readonly db: DbClient,
    private readonly deps: RepositoryDeps = defaultRepositoryDeps,
  ) {}

  async start(rawInput: StartFastSessionInput): Promise<FastSession> {
    const input = StartFastSessionInputSchema.parse(rawInput);
    const timestamp = this.deps.now();
    const id = this.deps.newId();
    const startedAt = input.startedAt ?? timestamp;
    const targetHours = resolveTargetHours(input);

    try {
      await this.db.runAsync(
        `INSERT INTO fast_sessions
           (id, user_id, protocol, target_hours, status, started_at, ended_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'running', ?, NULL, ?, ?)`,
        [id, input.userId, input.protocol, targetHours, startedAt, timestamp, timestamp],
      );
    } catch (error) {
      // Index unique partiel idx_fast_sessions_one_running : une seule session en cours.
      if (sqlErrorMessage(error).includes('UNIQUE')) {
        throw new Error(ACTIVE_SESSION_ERROR);
      }
      throw error;
    }

    return toFastSession({
      id,
      user_id: input.userId,
      protocol: input.protocol,
      target_hours: targetHours,
      status: 'running',
      started_at: startedAt,
      ended_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  async getActive(userId: string): Promise<FastSession | null> {
    const row = await this.db.getFirstAsync<FastSessionRow>(
      "SELECT * FROM fast_sessions WHERE user_id = ? AND status = 'running'",
      [userId],
    );
    return row ? toFastSession(row) : null;
  }

  async getById(id: string): Promise<FastSession | null> {
    const row = await this.db.getFirstAsync<FastSessionRow>(
      'SELECT * FROM fast_sessions WHERE id = ?',
      [id],
    );
    return row ? toFastSession(row) : null;
  }

  async list(userId: string, options: FastSessionListOptions = {}): Promise<FastSession[]> {
    const limit = options.limit ?? DEFAULT_LIST_LIMIT;
    const since = options.since ?? 0;
    const rows = await this.db.getAllAsync<FastSessionRow>(
      `SELECT * FROM fast_sessions
       WHERE user_id = ? AND started_at >= ?
       ORDER BY started_at DESC
       LIMIT ?`,
      [userId, since, limit],
    );
    return rows.map(toFastSession);
  }

  complete(id: string, endedAt: number): Promise<FastSession> {
    return this.end(id, 'completed', endedAt);
  }

  cancel(id: string, endedAt: number): Promise<FastSession> {
    return this.end(id, 'cancelled', endedAt);
  }

  private async end(
    id: string,
    status: Extract<FastSessionStatus, 'completed' | 'cancelled'>,
    endedAt: number,
  ): Promise<FastSession> {
    const result = await this.db.runAsync(
      `UPDATE fast_sessions
       SET status = ?, ended_at = ?, updated_at = ?
       WHERE id = ? AND status = 'running'`,
      [status, endedAt, this.deps.now(), id],
    );

    if (result.changes === 0) {
      const existing = await this.getById(id);
      throw new Error(existing ? SESSION_NOT_RUNNING_ERROR : SESSION_NOT_FOUND_ERROR);
    }

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(SESSION_NOT_FOUND_ERROR);
    }
    return updated;
  }
}
