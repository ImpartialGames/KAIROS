import type { DbClient } from '@/db/client';
import { defaultRepositoryDeps, type RepositoryDeps } from '@/repositories/deps';
import type { JournalListOptions, JournalRepository } from '@/repositories/journal-repository';
import {
  CreateJournalEntryInputSchema,
  JournalEntrySchema,
  UpdateJournalEntryInputSchema,
  type CreateJournalEntryInput,
  type JournalEntry,
  type UpdateJournalEntryInput,
} from '@/schemas/journal-entry';

export const JOURNAL_ENTRY_NOT_FOUND_ERROR = 'Entrée de journal introuvable';

const DEFAULT_LIST_LIMIT = 50;

interface JournalEntryRow {
  id: string;
  user_id: string;
  session_id: string | null;
  mood: number | null;
  note: string | null;
  created_at: number;
  updated_at: number;
}

const toJournalEntry = (row: JournalEntryRow): JournalEntry =>
  JournalEntrySchema.parse({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    mood: row.mood,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export class SqliteJournalRepository implements JournalRepository {
  constructor(
    private readonly db: DbClient,
    private readonly deps: RepositoryDeps = defaultRepositoryDeps,
  ) {}

  async create(rawInput: CreateJournalEntryInput): Promise<JournalEntry> {
    const input = CreateJournalEntryInputSchema.parse(rawInput);
    const timestamp = this.deps.now();
    const id = this.deps.newId();

    await this.db.runAsync(
      `INSERT INTO journal_entries (id, user_id, session_id, mood, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.userId, input.sessionId, input.mood, input.note, timestamp, timestamp],
    );

    return toJournalEntry({
      id,
      user_id: input.userId,
      session_id: input.sessionId,
      mood: input.mood,
      note: input.note,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  async update(id: string, rawPatch: UpdateJournalEntryInput): Promise<JournalEntry> {
    const patch = UpdateJournalEntryInputSchema.parse(rawPatch);
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(JOURNAL_ENTRY_NOT_FOUND_ERROR);
    }

    // Valide l'entrée fusionnée AVANT d'écrire : impossible de vider humeur et note.
    const merged = JournalEntrySchema.parse({
      ...existing,
      mood: patch.mood !== undefined ? patch.mood : existing.mood,
      note: patch.note !== undefined ? patch.note : existing.note,
      updatedAt: this.deps.now(),
    });

    await this.db.runAsync(
      'UPDATE journal_entries SET mood = ?, note = ?, updated_at = ? WHERE id = ?',
      [merged.mood, merged.note, merged.updatedAt, id],
    );
    return merged;
  }

  async remove(id: string): Promise<void> {
    const result = await this.db.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new Error(JOURNAL_ENTRY_NOT_FOUND_ERROR);
    }
  }

  async upsert(rawEntry: JournalEntry): Promise<void> {
    const entry = JournalEntrySchema.parse(rawEntry);
    await this.db.runAsync(
      `INSERT INTO journal_entries (id, user_id, session_id, mood, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         session_id = excluded.session_id,
         mood = excluded.mood,
         note = excluded.note,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      [
        entry.id,
        entry.userId,
        entry.sessionId,
        entry.mood,
        entry.note,
        entry.createdAt,
        entry.updatedAt,
      ],
    );
  }

  async getById(id: string): Promise<JournalEntry | null> {
    const row = await this.db.getFirstAsync<JournalEntryRow>(
      'SELECT * FROM journal_entries WHERE id = ?',
      [id],
    );
    return row ? toJournalEntry(row) : null;
  }

  async list(userId: string, options: JournalListOptions = {}): Promise<JournalEntry[]> {
    const limit = options.limit ?? DEFAULT_LIST_LIMIT;
    const before = options.before ?? Number.MAX_SAFE_INTEGER;
    const rows = await this.db.getAllAsync<JournalEntryRow>(
      `SELECT * FROM journal_entries
       WHERE user_id = ? AND created_at < ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, before, limit],
    );
    return rows.map(toJournalEntry);
  }
}
