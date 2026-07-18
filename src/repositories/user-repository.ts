import type { User } from '@/schemas/user';

export interface UserRepository {
  /**
   * Retourne l'utilisateur local, en le créant comme invité s'il n'existe pas
   * encore (premier lancement). Idempotent : toujours le même enregistrement —
   * c'est lui qui sera mis à jour en place à l'inscription (Phase 1).
   */
  getOrCreateGuest(): Promise<User>;
  /** Utilisateur local courant, null avant le tout premier lancement. */
  getCurrent(): Promise<User | null>;
}
