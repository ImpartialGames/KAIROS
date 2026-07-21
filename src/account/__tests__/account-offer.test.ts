import { randomUUID } from 'node:crypto';

import { computeAccountOffer, shouldOfferAccount } from '@/account/account-offer';
import { HOUR_MS } from '@/domain/fasting';
import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { createRepositories, type Repositories } from '@/repositories';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

describe('shouldOfferAccount', () => {
  it('propose à un invité ayant terminé un jeûne', () => {
    expect(
      shouldOfferAccount({ isGuest: true, completedFasts: 1, hasHistoryBeyond30Days: false }),
    ).toBe(true);
  });

  it('propose à un invité avec un historique > 30 jours', () => {
    expect(
      shouldOfferAccount({ isGuest: true, completedFasts: 0, hasHistoryBeyond30Days: true }),
    ).toBe(true);
  });

  it('ne propose pas à un invité sans données', () => {
    expect(
      shouldOfferAccount({ isGuest: true, completedFasts: 0, hasHistoryBeyond30Days: false }),
    ).toBe(false);
  });

  it('ne propose jamais à un inscrit', () => {
    expect(
      shouldOfferAccount({ isGuest: false, completedFasts: 5, hasHistoryBeyond30Days: true }),
    ).toBe(false);
  });
});

describe('computeAccountOffer', () => {
  let db: TestDbClient;
  let repos: Repositories;
  let userId: string;

  beforeEach(async () => {
    db = await createTestDb();
    let clock = NOW;
    repos = createRepositories(db, { newId: randomUUID, now: () => (clock += 1000) });
    userId = (await repos.users.getOrCreateGuest()).id;
  });

  afterEach(() => {
    db.close();
  });

  it('compte les jeûnes terminés et détecte un historique > 30 jours', async () => {
    const recent = await repos.fastSessions.start({
      userId,
      protocol: '16:8',
      startedAt: NOW - 2 * DAY,
    });
    await repos.fastSessions.complete(recent.id, NOW - 2 * DAY + 16 * HOUR_MS);

    let inputs = await computeAccountOffer(repos, userId, NOW);
    expect(inputs.completedFasts).toBe(1);
    expect(inputs.hasHistoryBeyond30Days).toBe(false);

    const old = await repos.fastSessions.start({
      userId,
      protocol: '18:6',
      startedAt: NOW - 40 * DAY,
    });
    await repos.fastSessions.complete(old.id, NOW - 40 * DAY + 18 * HOUR_MS);

    inputs = await computeAccountOffer(repos, userId, NOW);
    expect(inputs.completedFasts).toBe(2);
    expect(inputs.hasHistoryBeyond30Days).toBe(true);
  });
});
