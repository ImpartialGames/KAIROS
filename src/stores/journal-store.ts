import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { JOURNAL_WINDOW_DAYS } from '@/domain/journal-feed';
import type { Repositories } from '@/repositories';
import type { FastSession } from '@/schemas/fast-session';
import type { JournalEntry, RessentiTag } from '@/schemas/journal-entry';
import type { User } from '@/schemas/user';
import { appStore } from '@/stores/app-store';

export const JOURNAL_APP_NOT_READY_ERROR = "L'app n'est pas encore initialisée";

const DAY_MS = 86_400_000;
const ENTRY_FETCH_LIMIT = 200;

export interface NewJournalEntry {
  mood: number | null;
  tags: RessentiTag[];
  note: string | null;
}

export interface JournalState {
  entries: JournalEntry[];
  /** Sessions terminées/abandonnées de la fenêtre (running exclue). */
  sessions: FastSession[];
  /** Paliers biochimiques atteints par session (heures). */
  phasesBySession: Record<string, number[]>;
  loaded: boolean;
  /** Charge l'historique des 30 derniers jours. */
  load(): Promise<void>;
  /** Ajoute une note (humeur et/ou texte) et la place en tête du fil. */
  addEntry(input: NewJournalEntry): Promise<void>;
}

export interface JournalStoreDeps {
  getApp(): { repositories: Repositories | null; user: User | null };
  now?(): number;
}

export function createJournalStore({ getApp, now = Date.now }: JournalStoreDeps) {
  const requireApp = () => {
    const { repositories, user } = getApp();
    if (!repositories || !user) {
      throw new Error(JOURNAL_APP_NOT_READY_ERROR);
    }
    return { repositories, user };
  };

  return createStore<JournalState>()((set, get) => ({
    entries: [],
    sessions: [],
    phasesBySession: {},
    loaded: false,

    async load() {
      const { repositories, user } = requireApp();
      const since = now() - JOURNAL_WINDOW_DAYS * DAY_MS;

      const sessions = (await repositories.fastSessions.list(user.id, { since })).filter(
        (session) => session.status !== 'running',
      );
      const entries = (
        await repositories.journal.list(user.id, { limit: ENTRY_FETCH_LIMIT })
      ).filter((entry) => entry.createdAt >= since);

      const phasesBySession: Record<string, number[]> = {};
      for (const session of sessions) {
        const phases = await repositories.phasesReached.listBySession(session.id);
        phasesBySession[session.id] = phases.map((phase) => phase.hours);
      }

      set({ sessions, entries, phasesBySession, loaded: true });
    },

    async addEntry(input) {
      const { repositories, user } = requireApp();
      // Rattache la saisie au jeûne en cours s'il y en a un : c'est ce lien qui
      // permet, plus tard, de situer le ressenti dans la phase biochimique
      // (heures écoulées = createdAt − session.startedAt). Hors jeûne : null.
      const active = await repositories.fastSessions.getActive(user.id);
      const entry = await repositories.journal.create({
        userId: user.id,
        sessionId: active?.id ?? null,
        mood: input.mood,
        tags: input.tags,
        note: input.note,
      });
      set({ entries: [entry, ...get().entries] });
    },
  }));
}

/** Store journal unique (production) — les tests créent le leur via createJournalStore. */
export const journalStore = createJournalStore({
  getApp: () => {
    const { repositories, user } = appStore.getState();
    return { repositories, user };
  },
});

export function useJournalStore<T>(selector: (state: JournalState) => T): T {
  return useStore(journalStore, selector);
}
