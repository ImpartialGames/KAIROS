import type { SupabaseClient } from '@supabase/supabase-js';

import type { FastSession } from '@/schemas/fast-session';
import { SupabaseRemoteStore } from '@/sync/supabase-remote-store';

const T0 = 1_700_000_000_000;
const USER = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const SESSION_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

const session: FastSession = {
  id: SESSION_ID,
  userId: USER,
  protocol: '16:8',
  targetHours: 16,
  status: 'completed',
  startedAt: T0,
  endedAt: T0 + 16 * 3_600_000,
  createdAt: T0,
  updatedAt: T0,
};

/** Faux client Supabase : capture les upserts, sert des lignes fixées. */
function fakeSupabase(config: {
  onUpsert?: (table: string, rows: unknown) => void;
  rows?: Record<string, unknown[]>;
  upsertError?: string;
}): SupabaseClient {
  return {
    from(table: string) {
      return {
        upsert: (rows: unknown) => {
          config.onUpsert?.(table, rows);
          return Promise.resolve({
            error: config.upsertError ? { message: config.upsertError } : null,
          });
        },
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            returns: () => Promise.resolve({ data: config.rows?.[table] ?? [], error: null }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;
}

describe('SupabaseRemoteStore', () => {
  it('upsert : mappe camelCase → snake_case sur la bonne table', async () => {
    let captured: Record<string, unknown>[] = [];
    const store = new SupabaseRemoteStore(
      fakeSupabase({
        onUpsert: (table, rows) => {
          if (table === 'fast_sessions') captured = rows as Record<string, unknown>[];
        },
      }),
    );

    await store.upsertFastSessions([session]);

    expect(captured[0]).toMatchObject({
      id: SESSION_ID,
      user_id: USER,
      target_hours: 16,
      started_at: T0,
      ended_at: T0 + 16 * 3_600_000,
    });
    expect(captured[0]).not.toHaveProperty('userId');
  });

  it('upsert vide : aucune écriture', async () => {
    const onUpsert = jest.fn();
    const store = new SupabaseRemoteStore(fakeSupabase({ onUpsert }));
    await store.upsertFastSessions([]);
    expect(onUpsert).not.toHaveBeenCalled();
  });

  it('list : mappe snake_case → domaine et valide via Zod', async () => {
    const store = new SupabaseRemoteStore(
      fakeSupabase({
        rows: {
          fast_sessions: [
            {
              id: SESSION_ID,
              user_id: USER,
              protocol: '16:8',
              target_hours: 16,
              status: 'completed',
              started_at: T0,
              ended_at: T0 + 16 * 3_600_000,
              created_at: T0,
              updated_at: T0,
            },
          ],
        },
      }),
    );

    const result = await store.listFastSessions(USER);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: SESSION_ID, userId: USER, targetHours: 16 });
  });

  it('propage une erreur Supabase', async () => {
    const store = new SupabaseRemoteStore(fakeSupabase({ upsertError: 'RLS refus' }));
    await expect(store.upsertFastSessions([session])).rejects.toThrow(/RLS refus/);
  });
});
