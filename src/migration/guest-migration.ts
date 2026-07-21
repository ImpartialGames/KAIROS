import type { Repositories } from '@/repositories';
import type { RemoteStore } from '@/sync/remote-store';

/** Assez grand pour tout remonter (l'invité en local n'a jamais des volumes énormes). */
const FETCH_ALL = Number.MAX_SAFE_INTEGER;

export interface GuestMigrationParams {
  repositories: Repositories;
  remote: RemoteStore;
  /** Id local de l'enregistrement invité. */
  localUserId: string;
  /** Id du compte Supabase fraîchement créé. */
  authUserId: string;
}

/**
 * Migration invité → inscrit (Phase 1, point critique — CLAUDE.md).
 *
 * 1. Convertit l'enregistrement invité EN PLACE (is_guest=0, lien compte) —
 *    jamais recréé ; les données locales gardent leur user_id local.
 * 2. Téléverse toutes les données locales vers le cloud, en remappant `userId`
 *    sur le compte Supabase (les ids d'entités restent identiques → sync 1:1).
 *
 * Idempotente : chaque écriture cloud est un upsert et la conversion locale est
 * une mise à jour ; un rejeu après interruption ne perd ni ne duplique rien.
 * Ordre respectant les clés étrangères cloud : profil → sessions → paliers → notes.
 */
export async function migrateGuestToAccount({
  repositories,
  remote,
  localUserId,
  authUserId,
}: GuestMigrationParams): Promise<void> {
  // 1. Conversion locale en place (source de vérité locale préservée).
  const user = await repositories.users.convertGuestToRegistered(localUserId, authUserId);

  // 2. Rassemble toutes les données locales de l'invité.
  const sessions = await repositories.fastSessions.list(localUserId, { limit: FETCH_ALL });
  const entries = await repositories.journal.list(localUserId, { limit: FETCH_ALL });
  const phases = (
    await Promise.all(sessions.map((s) => repositories.phasesReached.listBySession(s.id)))
  ).flat();

  // 3. Téléversement cloud (userId remappé sur le compte), dans l'ordre des FK.
  await remote.upsertProfile({
    id: authUserId,
    precautionsAcknowledgedAt: user.precautionsAcknowledgedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
  await remote.upsertFastSessions(sessions.map((s) => ({ ...s, userId: authUserId })));
  await remote.upsertPhasesReached(phases);
  await remote.upsertJournalEntries(entries.map((e) => ({ ...e, userId: authUserId })));
}
