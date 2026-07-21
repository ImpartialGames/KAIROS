import type { RemoteProfile, RemoteStore } from '@/sync/remote-store';
import type { FastSession } from '@/schemas/fast-session';
import type { JournalEntry } from '@/schemas/journal-entry';
import type { PhaseReached } from '@/schemas/phase-reached';

/**
 * Faux stockage cloud en mémoire pour les tests. Les upserts remplacent par id
 * (idempotents) exactement comme le ferait Supabase avec `upsert`.
 */
export class FakeRemoteStore implements RemoteStore {
  private readonly profiles = new Map<string, RemoteProfile>();
  private readonly sessions = new Map<string, FastSession>();
  private readonly phases = new Map<string, PhaseReached>();
  private readonly entries = new Map<string, JournalEntry>();

  async upsertProfile(profile: RemoteProfile): Promise<void> {
    this.profiles.set(profile.id, profile);
  }

  async upsertFastSessions(sessions: readonly FastSession[]): Promise<void> {
    for (const session of sessions) {
      this.sessions.set(session.id, session);
    }
  }

  async upsertPhasesReached(phases: readonly PhaseReached[]): Promise<void> {
    for (const phase of phases) {
      this.phases.set(phase.id, phase);
    }
  }

  async upsertJournalEntries(entries: readonly JournalEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
  }

  async getProfile(id: string): Promise<RemoteProfile | null> {
    return this.profiles.get(id) ?? null;
  }

  async listFastSessions(userId: string): Promise<FastSession[]> {
    return [...this.sessions.values()].filter((s) => s.userId === userId);
  }

  async listPhasesReached(sessionId: string): Promise<PhaseReached[]> {
    return [...this.phases.values()].filter((p) => p.sessionId === sessionId);
  }

  async listJournalEntries(userId: string): Promise<JournalEntry[]> {
    return [...this.entries.values()].filter((e) => e.userId === userId);
  }
}
