import type { DbClient } from '@/db/client';
import { sqlErrorMessage } from '@/db/sql-error';
import { defaultRepositoryDeps, type RepositoryDeps } from '@/repositories/deps';
import type { PhaseReachedRepository } from '@/repositories/phase-reached-repository';
import {
  PhaseReachedSchema,
  RecordPhaseInputSchema,
  type PhaseReached,
  type RecordPhaseInput,
} from '@/schemas/phase-reached';

export const PHASE_SESSION_NOT_FOUND_ERROR = 'Session inconnue pour ce jalon biochimique';

interface PhaseReachedRow {
  id: string;
  session_id: string;
  hours: number;
  reached_at: number;
}

const toPhaseReached = (row: PhaseReachedRow): PhaseReached =>
  PhaseReachedSchema.parse({
    id: row.id,
    sessionId: row.session_id,
    hours: row.hours,
    reachedAt: row.reached_at,
  });

export class SqlitePhaseReachedRepository implements PhaseReachedRepository {
  constructor(
    private readonly db: DbClient,
    private readonly deps: RepositoryDeps = defaultRepositoryDeps,
  ) {}

  async record(rawInput: RecordPhaseInput): Promise<PhaseReached> {
    const input = RecordPhaseInputSchema.parse(rawInput);

    try {
      // INSERT OR IGNORE : l'unicité (session_id, hours) rend l'opération idempotente.
      await this.db.runAsync(
        'INSERT OR IGNORE INTO phases_reached (id, session_id, hours, reached_at) VALUES (?, ?, ?, ?)',
        [this.deps.newId(), input.sessionId, input.hours, input.reachedAt],
      );
    } catch (error) {
      if (sqlErrorMessage(error).includes('FOREIGN KEY')) {
        throw new Error(PHASE_SESSION_NOT_FOUND_ERROR);
      }
      throw error;
    }

    const row = await this.db.getFirstAsync<PhaseReachedRow>(
      'SELECT * FROM phases_reached WHERE session_id = ? AND hours = ?',
      [input.sessionId, input.hours],
    );
    if (!row) {
      // INSERT OR IGNORE avale la violation de clé étrangère : session inexistante.
      throw new Error(PHASE_SESSION_NOT_FOUND_ERROR);
    }
    return toPhaseReached(row);
  }

  async listBySession(sessionId: string): Promise<PhaseReached[]> {
    const rows = await this.db.getAllAsync<PhaseReachedRow>(
      'SELECT * FROM phases_reached WHERE session_id = ? ORDER BY hours ASC',
      [sessionId],
    );
    return rows.map(toPhaseReached);
  }
}
