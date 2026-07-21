import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { DbClient } from '@/db/client';
import { getDatabase } from '@/db/database';
import { sqlErrorMessage } from '@/db/sql-error';
import { createRepositories, type Repositories } from '@/repositories';
import type { RepositoryDeps } from '@/repositories/deps';
import type { User } from '@/schemas/user';

export const APP_NOT_READY_ERROR = "L'app n'est pas encore initialisée";

export type AppStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppState {
  status: AppStatus;
  user: User | null;
  repositories: Repositories | null;
  error: string | null;
  /**
   * Premier lancement : ouvre la base (migrations incluses) et crée/recharge
   * l'enregistrement invité auquel toutes les données sont rattachées.
   */
  bootstrap(): Promise<void>;
  /** Enregistre l'acceptation de l'écran précautions pour l'utilisateur courant. */
  acknowledgePrecautions(): Promise<void>;
  /** Remplace l'utilisateur courant (ex. après conversion invité → inscrit). */
  setUser(user: User): void;
}

/** L'écran précautions doit être montré tant que l'utilisateur ne l'a pas accepté. */
export const selectNeedsPrecautions = (state: AppState): boolean =>
  state.user === null || state.user.precautionsAcknowledgedAt === null;

export interface AppStoreDeps {
  getDb(): Promise<DbClient>;
  now?(): number;
  repositoryDeps?: RepositoryDeps;
}

export function createAppStore({ getDb, now = Date.now, repositoryDeps }: AppStoreDeps) {
  return createStore<AppState>()((set, get) => ({
    status: 'idle',
    user: null,
    repositories: null,
    error: null,

    async bootstrap() {
      const { status } = get();
      if (status === 'loading' || status === 'ready') {
        return;
      }
      set({ status: 'loading', error: null });
      try {
        const db = await getDb();
        const repositories = createRepositories(db, repositoryDeps);
        const user = await repositories.users.getOrCreateGuest();
        set({ status: 'ready', user, repositories });
      } catch (error) {
        set({ status: 'error', error: sqlErrorMessage(error) });
      }
    },

    async acknowledgePrecautions() {
      const { repositories, user } = get();
      if (!repositories || !user) {
        throw new Error(APP_NOT_READY_ERROR);
      }
      const updated = await repositories.users.acknowledgePrecautions(user.id, now());
      set({ user: updated });
    },

    setUser(user) {
      set({ user });
    },
  }));
}

/** Store applicatif unique (production) — les tests créent le leur via createAppStore. */
export const appStore = createAppStore({ getDb: getDatabase });

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}
