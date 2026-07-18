import type { FastSession } from '@/schemas/fast-session';
import type { JournalEntry } from '@/schemas/journal-entry';

/** Historique gratuit limité à 30 jours (cahier des charges §5). */
export const JOURNAL_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

/** Un élément du fil du journal : soit une session de jeûne, soit une note. */
export type JournalFeedItem =
  | { kind: 'session'; at: number; session: FastSession }
  | { kind: 'entry'; at: number; entry: JournalEntry };

/**
 * Fusionne sessions terminées et notes en un fil chronologique décroissant,
 * borné à la fenêtre (30 j par défaut). La session en cours (running) est
 * exclue : elle vit sur l'écran d'accueil, pas dans l'historique.
 */
export function buildJournalFeed(
  sessions: readonly FastSession[],
  entries: readonly JournalEntry[],
  now: number,
  windowDays: number = JOURNAL_WINDOW_DAYS,
): JournalFeedItem[] {
  const since = now - windowDays * DAY_MS;
  const items: JournalFeedItem[] = [];

  for (const session of sessions) {
    if (session.status !== 'running' && session.startedAt >= since) {
      items.push({ kind: 'session', at: session.startedAt, session });
    }
  }
  for (const entry of entries) {
    if (entry.createdAt >= since) {
      items.push({ kind: 'entry', at: entry.createdAt, entry });
    }
  }

  return items.sort((a, b) => b.at - a.at);
}
