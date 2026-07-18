import type { DbClient } from '@/db/client';
import { defaultRepositoryDeps, type RepositoryDeps } from '@/repositories/deps';
import type { FastSessionRepository } from '@/repositories/fast-session-repository';
import type { JournalRepository } from '@/repositories/journal-repository';
import type { PhaseReachedRepository } from '@/repositories/phase-reached-repository';
import { SqliteFastSessionRepository } from '@/repositories/sqlite/sqlite-fast-session-repository';
import { SqliteJournalRepository } from '@/repositories/sqlite/sqlite-journal-repository';
import { SqlitePhaseReachedRepository } from '@/repositories/sqlite/sqlite-phase-reached-repository';
import { SqliteUserRepository } from '@/repositories/sqlite/sqlite-user-repository';
import type { UserRepository } from '@/repositories/user-repository';

export interface Repositories {
  users: UserRepository;
  fastSessions: FastSessionRepository;
  phasesReached: PhaseReachedRepository;
  journal: JournalRepository;
}

/** Point d'assemblage unique de la persistance — le reste de l'app ne voit que les interfaces. */
export function createRepositories(
  db: DbClient,
  deps: RepositoryDeps = defaultRepositoryDeps,
): Repositories {
  return {
    users: new SqliteUserRepository(db, deps),
    fastSessions: new SqliteFastSessionRepository(db, deps),
    phasesReached: new SqlitePhaseReachedRepository(db, deps),
    journal: new SqliteJournalRepository(db, deps),
  };
}
