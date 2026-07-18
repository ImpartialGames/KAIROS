import type { FastSession, StartFastSessionInput } from '@/schemas/fast-session';

export interface FastSessionListOptions {
  /** Nombre maximal de sessions retournées (défaut : 50). */
  limit?: number;
  /** Ne retourne que les sessions démarrées à partir de ce timestamp (ms). */
  since?: number;
}

export interface FastSessionRepository {
  /** Démarre une session. Rejette s'il en existe déjà une en cours pour cet utilisateur. */
  start(input: StartFastSessionInput): Promise<FastSession>;
  /** Session en cours de l'utilisateur, null sinon. */
  getActive(userId: string): Promise<FastSession | null>;
  getById(id: string): Promise<FastSession | null>;
  /** Sessions triées de la plus récente à la plus ancienne. */
  list(userId: string, options?: FastSessionListOptions): Promise<FastSession[]>;
  /** Termine la session en cours (objectif atteint ou arrêt volontaire comptabilisé). */
  complete(id: string, endedAt: number): Promise<FastSession>;
  /** Abandonne la session en cours (non comptabilisée dans les statistiques). */
  cancel(id: string, endedAt: number): Promise<FastSession>;
}
