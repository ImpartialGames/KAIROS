import type { SupabaseClient } from '@supabase/supabase-js';

import { FastSessionSchema, type FastSession } from '@/schemas/fast-session';
import { JournalEntrySchema, type JournalEntry } from '@/schemas/journal-entry';
import { PhaseReachedSchema, type PhaseReached } from '@/schemas/phase-reached';
import type { RemoteProfile, RemoteStore } from '@/sync/remote-store';

/** Lignes cloud (snake_case, comme le schéma SQL). */
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
interface PhaseRow {
  id: string;
  session_id: string;
  hours: number;
  reached_at: number;
}
interface JournalRow {
  id: string;
  user_id: string;
  session_id: string | null;
  mood: number | null;
  /** Ressentis (Phase 2) : colonne jsonb côté cloud → tableau natif ici. */
  tags: string[];
  note: string | null;
  created_at: number;
  updated_at: number;
}
interface ProfileRow {
  id: string;
  precautions_acknowledged_at: number | null;
  created_at: number;
  updated_at: number;
}

const fromSession = (s: FastSession): FastSessionRow => ({
  id: s.id,
  user_id: s.userId,
  protocol: s.protocol,
  target_hours: s.targetHours,
  status: s.status,
  started_at: s.startedAt,
  ended_at: s.endedAt,
  created_at: s.createdAt,
  updated_at: s.updatedAt,
});
const toSession = (r: FastSessionRow): FastSession =>
  FastSessionSchema.parse({
    id: r.id,
    userId: r.user_id,
    protocol: r.protocol,
    targetHours: r.target_hours,
    status: r.status,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

const fromPhase = (p: PhaseReached): PhaseRow => ({
  id: p.id,
  session_id: p.sessionId,
  hours: p.hours,
  reached_at: p.reachedAt,
});
const toPhase = (r: PhaseRow): PhaseReached =>
  PhaseReachedSchema.parse({
    id: r.id,
    sessionId: r.session_id,
    hours: r.hours,
    reachedAt: r.reached_at,
  });

const fromEntry = (e: JournalEntry): JournalRow => ({
  id: e.id,
  user_id: e.userId,
  session_id: e.sessionId,
  mood: e.mood,
  tags: e.tags,
  note: e.note,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
});
const toEntry = (r: JournalRow): JournalEntry =>
  JournalEntrySchema.parse({
    id: r.id,
    userId: r.user_id,
    sessionId: r.session_id,
    mood: r.mood,
    // Une ligne cloud d'avant la migration tags peut renvoyer null → [].
    tags: r.tags ?? [],
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

/**
 * RemoteStore adossé à Supabase. Les écritures sont des upserts par clé primaire
 * (idempotents). Les lectures repassent par Zod, comme la couche locale.
 * La RLS garantit qu'on ne lit/écrit que les données du compte connecté.
 */
export class SupabaseRemoteStore implements RemoteStore {
  constructor(private readonly supabase: SupabaseClient) {}

  private fail(context: string, message: string): never {
    throw new Error(`Supabase (${context}) : ${message}`);
  }

  async upsertProfile(profile: RemoteProfile): Promise<void> {
    const { error } = await this.supabase.from('profiles').upsert({
      id: profile.id,
      precautions_acknowledged_at: profile.precautionsAcknowledgedAt,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    } satisfies ProfileRow);
    if (error) this.fail('upsertProfile', error.message);
  }

  async upsertFastSessions(sessions: readonly FastSession[]): Promise<void> {
    if (sessions.length === 0) return;
    const { error } = await this.supabase.from('fast_sessions').upsert(sessions.map(fromSession));
    if (error) this.fail('upsertFastSessions', error.message);
  }

  async upsertPhasesReached(phases: readonly PhaseReached[]): Promise<void> {
    if (phases.length === 0) return;
    const { error } = await this.supabase.from('phases_reached').upsert(phases.map(fromPhase));
    if (error) this.fail('upsertPhasesReached', error.message);
  }

  async upsertJournalEntries(entries: readonly JournalEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const { error } = await this.supabase.from('journal_entries').upsert(entries.map(fromEntry));
    if (error) this.fail('upsertJournalEntries', error.message);
  }

  async getProfile(id: string): Promise<RemoteProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle<ProfileRow>();
    if (error) this.fail('getProfile', error.message);
    if (!data) return null;
    return {
      id: data.id,
      precautionsAcknowledgedAt: data.precautions_acknowledged_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async listFastSessions(userId: string): Promise<FastSession[]> {
    const { data, error } = await this.supabase
      .from('fast_sessions')
      .select('*')
      .eq('user_id', userId)
      .returns<FastSessionRow[]>();
    if (error) this.fail('listFastSessions', error.message);
    return (data ?? []).map(toSession);
  }

  async listPhasesReached(sessionId: string): Promise<PhaseReached[]> {
    const { data, error } = await this.supabase
      .from('phases_reached')
      .select('*')
      .eq('session_id', sessionId)
      .returns<PhaseRow[]>();
    if (error) this.fail('listPhasesReached', error.message);
    return (data ?? []).map(toPhase);
  }

  async listJournalEntries(userId: string): Promise<JournalEntry[]> {
    const { data, error } = await this.supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .returns<JournalRow[]>();
    if (error) this.fail('listJournalEntries', error.message);
    return (data ?? []).map(toEntry);
  }
}
