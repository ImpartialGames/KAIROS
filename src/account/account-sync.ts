import { migrateGuestToAccount } from '@/migration/guest-migration';
import type { Repositories } from '@/repositories';
import type { User } from '@/schemas/user';
import { appStore } from '@/stores/app-store';
import { fastingStore } from '@/stores/fasting-store';
import { getSupabase } from '@/supabase/client';
import { pullAccountToLocal } from '@/sync/pull-sync';
import type { RemoteStore } from '@/sync/remote-store';
import { SupabaseRemoteStore } from '@/sync/supabase-remote-store';

/**
 * À la connexion, convertit l'invité local en inscrit (migration en place +
 * upload cloud) si ce n'est pas déjà fait. Retourne l'utilisateur mis à jour,
 * ou null si aucune migration n'était nécessaire. Partie pure et testable.
 */
export async function migrateGuestIfNeeded(params: {
  repositories: Repositories;
  remote: RemoteStore;
  localUser: User;
  authUserId: string;
}): Promise<User | null> {
  const { repositories, remote, localUser, authUserId } = params;

  // Un local déjà inscrit n'est jamais re-migré (conversion unique).
  if (!localUser.isGuest) {
    return null;
  }

  await migrateGuestToAccount({
    repositories,
    remote,
    localUserId: localUser.id,
    authUserId,
  });
  return repositories.users.getCurrent();
}

/**
 * Glu de production, appelée par _layout à chaque passage en « connecté ».
 * Deux temps, dans l'ordre :
 *   1. migration montante — convertit l'invité en inscrit + upload initial ;
 *   2. synchro descendante — rapatrie l'historique du compte (autres appareils).
 * Enchaînée à chaque connexion (idempotente) : un relancement d'app rapatrie
 * les changements faits ailleurs depuis. Recharge l'utilisateur (précautions
 * éventuellement rapatriées) et ré-hydrate le jeûne actif si le cloud en a un.
 */
export async function syncAccountOnSignIn(authUserId: string): Promise<void> {
  const { repositories, user } = appStore.getState();
  if (!repositories || !user) {
    return;
  }
  const remote = new SupabaseRemoteStore(getSupabase());
  const migrated = await migrateGuestIfNeeded({ repositories, remote, localUser: user, authUserId });
  const localUser = migrated ?? user;

  await pullAccountToLocal({ repositories, remote, localUser, authUserId });

  const fresh = await repositories.users.getCurrent();
  if (fresh) {
    appStore.getState().setUser(fresh);
  }
  // Un jeûne en cours rapatriée d'un autre appareil doit apparaître à l'écran.
  await fastingStore.getState().hydrate();
}
