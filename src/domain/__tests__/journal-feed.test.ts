import { HOUR_MS } from '@/domain/fasting';
import { buildJournalFeed } from '@/domain/journal-feed';
import type { FastSession } from '@/schemas/fast-session';
import type { JournalEntry } from '@/schemas/journal-entry';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

const session = (over: Partial<FastSession>): FastSession => ({
  id: 's',
  userId: 'u',
  protocol: '16:8',
  targetHours: 16,
  status: 'completed',
  startedAt: NOW - HOUR_MS,
  endedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

const entry = (over: Partial<JournalEntry>): JournalEntry => ({
  id: 'e',
  userId: 'u',
  sessionId: null,
  mood: 4,
  note: 'ok',
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe('buildJournalFeed', () => {
  it('fusionne et trie sessions + notes du plus récent au plus ancien', () => {
    const feed = buildJournalFeed(
      [session({ id: 's1', startedAt: NOW - 3 * DAY })],
      [
        entry({ id: 'e1', createdAt: NOW - 1 * DAY }),
        entry({ id: 'e2', createdAt: NOW - 5 * DAY }),
      ],
      NOW,
    );
    expect(feed.map((i) => i.at)).toEqual([NOW - 1 * DAY, NOW - 3 * DAY, NOW - 5 * DAY]);
    expect(feed[0]!.kind).toBe('entry');
    expect(feed[1]!.kind).toBe('session');
  });

  it('exclut la session en cours (elle vit sur l’accueil)', () => {
    const feed = buildJournalFeed(
      [session({ id: 'running', status: 'running', endedAt: null })],
      [],
      NOW,
    );
    expect(feed).toHaveLength(0);
  });

  it('borne à la fenêtre de 30 jours', () => {
    const feed = buildJournalFeed(
      [session({ id: 'old', startedAt: NOW - 31 * DAY })],
      [
        entry({ id: 'recent', createdAt: NOW - 29 * DAY }),
        entry({ id: 'tooOld', createdAt: NOW - 40 * DAY }),
      ],
      NOW,
    );
    expect(feed.map((i) => (i.kind === 'entry' ? i.entry.id : i.session.id))).toEqual(['recent']);
  });

  it('inclut sessions terminées et abandonnées', () => {
    const feed = buildJournalFeed(
      [
        session({ id: 'done', status: 'completed' }),
        session({ id: 'gaveUp', status: 'cancelled', startedAt: NOW - 2 * HOUR_MS }),
      ],
      [],
      NOW,
    );
    expect(feed).toHaveLength(2);
  });
});
