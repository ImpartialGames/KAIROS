import type { FastSession } from '@/schemas/fast-session';
import type { JournalEntry } from '@/schemas/journal-entry';
import type { PhaseReached } from '@/schemas/phase-reached';

/**
 * Accès au stockage cloud (Supabase en production, faux en mémoire en test).
 * Les données cloud utilisent le MÊME modèle que le local (mêmes ids, mêmes
 * timestamps ms) ; seul `userId` porte l'identifiant du compte Supabase.
 *
 * Toutes les écritures sont des upserts (idempotence) : rejouer une migration
 * interrompue ne crée pas de doublon.
 */
export interface RemoteProfile {
  id: string;
  precautionsAcknowledgedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface RemoteStore {
  upsertProfile(profile: RemoteProfile): Promise<void>;
  upsertFastSessions(sessions: readonly FastSession[]): Promise<void>;
  upsertPhasesReached(phases: readonly PhaseReached[]): Promise<void>;
  upsertJournalEntries(entries: readonly JournalEntry[]): Promise<void>;

  getProfile(id: string): Promise<RemoteProfile | null>;
  listFastSessions(userId: string): Promise<FastSession[]>;
  listPhasesReached(sessionId: string): Promise<PhaseReached[]>;
  listJournalEntries(userId: string): Promise<JournalEntry[]>;
}
