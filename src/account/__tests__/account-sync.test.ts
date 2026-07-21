import { randomUUID } from 'node:crypto';

import { migrateGuestIfNeeded } from '@/account/account-sync';
import { createTestDb } from '@/db/testing/create-test-db';
import type { TestDbClient } from '@/db/testing/node-client';
import { createRepositories, type Repositories } from '@/repositories';
import { FakeRemoteStore } from '@/sync/testing/fake-remote-store';

const T0 = 1_700_000_000_000;
const AUTH_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('migrateGuestIfNeeded', () => {
  let db: TestDbClient;
  let repos: Repositories;
  let remote: FakeRemoteStore;

  beforeEach(async () => {
    db = await createTestDb();
    let clock = T0;
    repos = createRepositories(db, { newId: randomUUID, now: () => (clock += 1000) });
    remote = new FakeRemoteStore();
  });

  afterEach(() => {
    db.close();
  });

  it('migre un invité et retourne l’utilisateur converti', async () => {
    const guest = await repos.users.getOrCreateGuest();
    await repos.journal.create({ userId: guest.id, mood: 3 });

    const updated = await migrateGuestIfNeeded({
      repositories: repos,
      remote,
      localUser: guest,
      authUserId: AUTH_ID,
    });

    expect(updated?.isGuest).toBe(false);
    expect(updated?.authUserId).toBe(AUTH_ID);
    expect(await remote.listJournalEntries(AUTH_ID)).toHaveLength(1);
  });

  it('ne re-migre pas un utilisateur déjà inscrit (retourne null, rien uploadé)', async () => {
    const guest = await repos.users.getOrCreateGuest();
    const registered = await repos.users.convertGuestToRegistered(guest.id, AUTH_ID);

    const result = await migrateGuestIfNeeded({
      repositories: repos,
      remote,
      localUser: registered,
      authUserId: AUTH_ID,
    });

    expect(result).toBeNull();
    expect(await remote.listJournalEntries(AUTH_ID)).toHaveLength(0);
  });
});
