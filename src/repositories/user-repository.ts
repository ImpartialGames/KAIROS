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
  /** Enregistre l'acceptation de l'écran précautions (avant le premier jeûne). */
  acknowledgePrecautions(userId: string, acknowledgedAt: number): Promise<User>;
  /**
   * Convertit l'invité en inscrit EN PLACE (is_guest=0, lien vers le compte
   * Supabase) — jamais recréé, aucune donnée locale déplacée (Phase 1, critique).
   */
  convertGuestToRegistered(userId: string, authUserId: string): Promise<User>;
}
