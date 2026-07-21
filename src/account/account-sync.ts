import { migrateGuestToAccount } from '@/migration/guest-migration';
import type { Repositories } from '@/repositories';
import type { User } from '@/schemas/user';
import { appStore } from '@/stores/app-store';
import { getSupabase } from '@/supabase/client';
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
 * Glu de production : câble la migration au store applicatif et au vrai cloud.
 * Appelée par _layout quand l'auth passe en « connecté ».
 */
export async function runGuestMigrationOnSignIn(authUserId: string): Promise<void> {
  const { repositories, user } = appStore.getState();
  if (!repositories || !user) {
    return;
  }
  const remote = new SupabaseRemoteStore(getSupabase());
  const updated = await migrateGuestIfNeeded({ repositories, remote, localUser: user, authUserId });
  if (updated) {
    appStore.getState().setUser(updated);
  }
}
