import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { milestoneTimeMs, PHASE_MILESTONE_HOURS } from '@/domain/fasting';
import i18n from '@/i18n';
import type { FastSession } from '@/schemas/fast-session';

const CHANNEL_ID = 'fasting-milestones';

/** Identifiant déterministe — permet d'annuler sans stocker d'ids côté DB. */
export function milestoneNotificationId(sessionId: string, hours: number): string {
  return `fast-${sessionId}-${hours}h`;
}

/** Affichage des notifications app ouverte (bannière, pas de son ni badge). */
export function initFastingNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Planifie une notification locale pour chaque palier encore à venir de la
 * session. Sans permission, ne fait rien (le timer reste fonctionnel).
 */
export async function scheduleMilestones(session: FastSession): Promise<void> {
  if (!(await ensurePermissions())) {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: i18n.t('notifications.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const nowMs = Date.now();
  for (const hours of PHASE_MILESTONE_HOURS) {
    const at = milestoneTimeMs(session.startedAt, hours);
    if (at <= nowMs) {
      continue;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: milestoneNotificationId(session.id, hours),
      content: {
        title: i18n.t('notifications.milestoneTitle', { hours }),
        body: i18n.t('notifications.milestoneBody', { hours }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(at),
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }
}

/** Annule les notifications restantes d'une session (fin ou abandon). */
export async function cancelMilestones(session: FastSession): Promise<void> {
  for (const hours of PHASE_MILESTONE_HOURS) {
    await Notifications.cancelScheduledNotificationAsync(
      milestoneNotificationId(session.id, hours),
    );
  }
}
