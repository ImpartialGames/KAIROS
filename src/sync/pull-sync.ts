import type { Repositories } from '@/repositories';
import type { User } from '@/schemas/user';
import type { RemoteStore } from '@/sync/remote-store';

export interface PullAccountParams {
  repositories: Repositories;
  remote: RemoteStore;
  /** Enregistrement local, déjà lié au compte. Ses données gardent son user_id local. */
  localUser: User;
  /** Id du compte Supabase — clé sous laquelle vivent les données cloud. */
  authUserId: string;
}

export interface PullSummary {
  sessions: number;
  phases: number;
  entries: number;
  /** Jeûnes en cours venus d'un autre appareil, ignorés pour protéger l'actif local. */
  skippedRunning: number;
}

/**
 * Synchro descendante (cloud → local) — Phase 1, multi-appareils.
 *
 * Miroir de la migration montante : rapatrie l'historique du compte dans la base
 * locale en remappant le userId cloud → user_id local. Les ids d'entités sont
 * partagés 1:1 entre local et cloud, donc chaque écriture est un upsert par id —
 * rejouable à chaque connexion, sans doublon.
 *
 * Invariant protégé (CLAUDE.md, aucune perte de données) : le jeûne EN COURS de
 * CET appareil n'est jamais écrasé par un jeûne en cours venu d'un autre appareil
 * — l'actif local gagne. Les sessions terminées, paliers et notes sont toujours
 * rapatriés. Une note rattachée à une session absente localement est rapatriée
 * détachée (sessionId null) plutôt que perdue ou en violation de clé étrangère.
 */
export async function pullAccountToLocal({
  repositories,
  remote,
  localUser,
  authUserId,
}: PullAccountParams): Promise<PullSummary> {
  const summary: PullSummary = { sessions: 0, phases: 0, entries: 0, skippedRunning: 0 };

  // 1. Profil : rapatrie l'accusé de précautions si le local ne l'a pas encore.
  //    On n'écrase jamais un accusé local par un cloud vide.
  const profile = await remote.getProfile(authUserId);
  if (
    profile?.precautionsAcknowledgedAt != null &&
    localUser.precautionsAcknowledgedAt == null
  ) {
    await repositories.users.acknowledgePrecautions(
      localUser.id,
      profile.precautionsAcknowledgedAt,
    );
  }

  // 2. Sessions : remap userId → local, en protégeant le jeûne actif de l'appareil.
  //    reservedRunningId garantit qu'au plus UNE session en cours atterrit en local
  //    (l'index unique partiel lèverait sinon), et que ce n'est pas l'actif local.
  const localActive = await repositories.fastSessions.getActive(localUser.id);
  let reservedRunningId: string | null = localActive?.id ?? null;
  const pulledSessionIds = new Set<string>();

  const cloudSessions = await remote.listFastSessions(authUserId);
  for (const cloud of cloudSessions) {
    const session = { ...cloud, userId: localUser.id };
    if (session.status === 'running') {
      if (reservedRunningId !== null && reservedRunningId !== session.id) {
        summary.skippedRunning += 1;
        continue;
      }
      reservedRunningId = session.id;
    }
    await repositories.fastSessions.upsert(session);
    pulledSessionIds.add(session.id);
    summary.sessions += 1;
  }

  // 3. Paliers : uniquement pour les sessions effectivement rapatriées (clé étrangère).
  for (const sessionId of pulledSessionIds) {
    const phases = await remote.listPhasesReached(sessionId);
    for (const phase of phases) {
      await repositories.phasesReached.upsert(phase);
      summary.phases += 1;
    }
  }

  // 4. Notes : remap userId → local, en détachant celles dont la session est absente.
  const cloudEntries = await remote.listJournalEntries(authUserId);
  for (const cloud of cloudEntries) {
    let sessionId = cloud.sessionId;
    if (sessionId !== null && !pulledSessionIds.has(sessionId)) {
      const exists = await repositories.fastSessions.getById(sessionId);
      if (!exists) {
        sessionId = null;
      }
    }
    await repositories.journal.upsert({ ...cloud, userId: localUser.id, sessionId });
    summary.entries += 1;
  }

  return summary;
}
