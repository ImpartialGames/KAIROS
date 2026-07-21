import type {
  CreateJournalEntryInput,
  JournalEntry,
  UpdateJournalEntryInput,
} from '@/schemas/journal-entry';

export interface JournalListOptions {
  /** Nombre maximal d'entrées retournées (défaut : 50). */
  limit?: number;
  /** Ne retourne que les entrées créées strictement avant ce timestamp (pagination). */
  before?: number;
}

export interface JournalRepository {
  create(input: CreateJournalEntryInput): Promise<JournalEntry>;
  /** Applique un patch partiel ; l'entrée fusionnée doit rester valide (humeur ou note). */
  update(id: string, patch: UpdateJournalEntryInput): Promise<JournalEntry>;
  remove(id: string): Promise<void>;
  getById(id: string): Promise<JournalEntry | null>;
  /** Entrées triées de la plus récente à la plus ancienne. */
  list(userId: string, options?: JournalListOptions): Promise<JournalEntry[]>;
  /**
   * Écrit une entrée complète (id, timestamps d'origine préservés) — synchro
   * descendante (pull cloud→local). Mise à jour EN PLACE par id. Idempotent.
   */
  upsert(entry: JournalEntry): Promise<void>;
}
