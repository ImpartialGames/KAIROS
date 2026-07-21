import type { Repositories } from '@/repositories';

/** Historique gratuit limité à 30 jours (cahier des charges §5). */
export const OFFER_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;
const FETCH_LIMIT = 100;

export interface AccountOfferInputs {
  isGuest: boolean;
  /** Nombre de jeûnes terminés (le 1er jeûne complet est un moment de valeur). */
  completedFasts: number;
  /** L'utilisateur a des données au-delà de la fenêtre gratuite de 30 jours. */
  hasHistoryBeyond30Days: boolean;
}

/**
 * Décide s'il faut proposer un compte (cahier des charges §2). Jamais à
 * l'onboarding : uniquement à un invité qui a des données à sauvegarder —
 * après son premier jeûne terminé, ou dès qu'il a un historique > 30 jours.
 */
export function shouldOfferAccount(input: AccountOfferInputs): boolean {
  return input.isGuest && (input.completedFasts >= 1 || input.hasHistoryBeyond30Days);
}

/** Calcule les moments de valeur depuis les données locales de l'utilisateur. */
export async function computeAccountOffer(
  repositories: Repositories,
  userId: string,
  now: number,
): Promise<Omit<AccountOfferInputs, 'isGuest'>> {
  const since = now - OFFER_WINDOW_DAYS * DAY_MS;
  const sessions = await repositories.fastSessions.list(userId, { limit: FETCH_LIMIT });
  const entries = await repositories.journal.list(userId, { limit: FETCH_LIMIT });

  return {
    completedFasts: sessions.filter((s) => s.status === 'completed').length,
    hasHistoryBeyond30Days:
      sessions.some((s) => s.startedAt < since) || entries.some((e) => e.createdAt < since),
  };
}
