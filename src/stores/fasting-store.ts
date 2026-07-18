import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { crossedMilestones, milestoneTimeMs } from '@/domain/fasting';
import { cancelMilestones, scheduleMilestones } from '@/notifications/fasting-notifications';
import type { Repositories } from '@/repositories';
import type { FastingProtocol, FastSession } from '@/schemas/fast-session';
import type { User } from '@/schemas/user';
import { appStore } from '@/stores/app-store';

export const PRECAUTIONS_REQUIRED_ERROR =
  'Les précautions doivent être lues et acceptées avant le premier jeûne';
export const NO_ACTIVE_SESSION_ERROR = 'Aucune session de jeûne en cours';
export const FASTING_APP_NOT_READY_ERROR = "L'app n'est pas encore initialisée";

export interface FastingState {
  activeSession: FastSession | null;
  /** Paliers déjà enregistrés pour la session active, triés croissant. */
  reachedHours: number[];
  hydrated: boolean;
  /** Recharge la session en cours et rattrape les paliers manqués (relance d'app). */
  hydrate(): Promise<void>;
  startFast(input: { protocol: FastingProtocol; targetHours?: number }): Promise<void>;
  /** Enregistre les paliers franchis à l'instant donné (tick UI, relance). */
  syncMilestones(nowMs?: number): Promise<void>;
  completeFast(): Promise<void>;
  cancelFast(): Promise<void>;
}

export interface FastingStoreDeps {
  getApp(): { repositories: Repositories | null; user: User | null };
  now?(): number;
  notifications?: {
    scheduleMilestones(session: FastSession): Promise<void>;
    cancelMilestones(session: FastSession): Promise<void>;
  };
}

export function createFastingStore({
  getApp,
  now = Date.now,
  notifications = { scheduleMilestones, cancelMilestones },
}: FastingStoreDeps) {
  const requireApp = () => {
    const { repositories, user } = getApp();
    if (!repositories || !user) {
      throw new Error(FASTING_APP_NOT_READY_ERROR);
    }
    return { repositories, user };
  };

  return createStore<FastingState>()((set, get) => ({
    activeSession: null,
    reachedHours: [],
    hydrated: false,

    async hydrate() {
      const { repositories, user } = requireApp();
      const activeSession = await repositories.fastSessions.getActive(user.id);
      if (!activeSession) {
        set({ activeSession: null, reachedHours: [], hydrated: true });
        return;
      }
      const phases = await repositories.phasesReached.listBySession(activeSession.id);
      set({
        activeSession,
        reachedHours: phases.map((phase) => phase.hours),
        hydrated: true,
      });
      // Paliers franchis pendant que l'app était fermée.
      await get().syncMilestones();
    },

    async startFast(input) {
      const { repositories, user } = requireApp();
      if (user.precautionsAcknowledgedAt === null) {
        throw new Error(PRECAUTIONS_REQUIRED_ERROR);
      }

      const session = await repositories.fastSessions.start({
        userId: user.id,
        protocol: input.protocol,
        targetHours: input.targetHours,
      });
      set({ activeSession: session, reachedHours: [] });
      await notifications.scheduleMilestones(session);
      await get().syncMilestones();
    },

    async syncMilestones(nowMs = now()) {
      const { activeSession, reachedHours } = get();
      if (!activeSession) {
        return;
      }
      const { repositories } = requireApp();

      const newHours = crossedMilestones(activeSession.startedAt, nowMs).filter(
        (hours) => !reachedHours.includes(hours),
      );
      if (newHours.length === 0) {
        return;
      }

      for (const hours of newHours) {
        await repositories.phasesReached.record({
          sessionId: activeSession.id,
          hours,
          // Instant biologique théorique du palier, pas l'instant d'observation.
          reachedAt: milestoneTimeMs(activeSession.startedAt, hours),
        });
      }
      set({ reachedHours: [...reachedHours, ...newHours].sort((a, b) => a - b) });
    },

    async completeFast() {
      const { activeSession } = get();
      if (!activeSession) {
        throw new Error(NO_ACTIVE_SESSION_ERROR);
      }
      const { repositories } = requireApp();

      // Jamais avant le début : une horloge qui recule (correction NTP) ne doit
      // pas produire endedAt < startedAt — la session serait invalide (cf. Zod).
      const endedAt = Math.max(now(), activeSession.startedAt);
      // Les paliers franchis d'ici la fin comptent (ex. terminer à 16h30 → 16h enregistré).
      await get().syncMilestones(endedAt);
      await repositories.fastSessions.complete(activeSession.id, endedAt);
      await notifications.cancelMilestones(activeSession);
      set({ activeSession: null, reachedHours: [] });
    },

    async cancelFast() {
      const { activeSession } = get();
      if (!activeSession) {
        throw new Error(NO_ACTIVE_SESSION_ERROR);
      }
      const { repositories } = requireApp();

      const endedAt = Math.max(now(), activeSession.startedAt);
      await repositories.fastSessions.cancel(activeSession.id, endedAt);
      await notifications.cancelMilestones(activeSession);
      set({ activeSession: null, reachedHours: [] });
    },
  }));
}

/** Store timer unique (production) — les tests créent le leur via createFastingStore. */
export const fastingStore = createFastingStore({
  getApp: () => {
    const { repositories, user } = appStore.getState();
    return { repositories, user };
  },
});

export function useFastingStore<T>(selector: (state: FastingState) => T): T {
  return useStore(fastingStore, selector);
}
