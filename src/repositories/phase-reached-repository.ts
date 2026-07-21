import type { PhaseReached, RecordPhaseInput } from '@/schemas/phase-reached';

export interface PhaseReachedRepository {
  /**
   * Enregistre un jalon biochimique atteint. Idempotent : ré-enregistrer le
   * même palier pour la même session retourne l'enregistrement existant.
   */
  record(input: RecordPhaseInput): Promise<PhaseReached>;
  /** Jalons d'une session, triés par palier horaire croissant. */
  listBySession(sessionId: string): Promise<PhaseReached[]>;
  /**
   * Écrit un jalon complet (id d'origine préservé) — synchro descendante
   * (pull cloud→local). Un jalon atteint est un fait immuable : s'il existe déjà
   * (par id ou par (session, palier)), l'existant est conservé. Idempotent.
   */
  upsert(phase: PhaseReached): Promise<void>;
}
