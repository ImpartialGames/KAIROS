import type { DbClient } from '@/db/client';

/**
 * Migrations versionnées via PRAGMA user_version : MIGRATIONS[n] fait passer
 * la base de la version n à n+1. Ne jamais modifier une migration publiée —
 * en ajouter une nouvelle.
 */
export const MIGRATIONS: readonly string[] = [
  // v1 — socle Phase 0 : invité, sessions de jeûne, jalons biochimiques, journal.
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    is_guest INTEGER NOT NULL DEFAULT 1 CHECK (is_guest IN (0, 1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE fast_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL,
    target_hours INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running'
      CHECK (status IN ('running', 'completed', 'cancelled')),
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK ((status = 'running') = (ended_at IS NULL))
  );
  CREATE INDEX idx_fast_sessions_user_started
    ON fast_sessions(user_id, started_at DESC);
  -- Une seule session en cours par utilisateur, garanti par la base elle-même.
  CREATE UNIQUE INDEX idx_fast_sessions_one_running
    ON fast_sessions(user_id) WHERE status = 'running';

  CREATE TABLE phases_reached (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES fast_sessions(id) ON DELETE CASCADE,
    hours INTEGER NOT NULL,
    reached_at INTEGER NOT NULL,
    UNIQUE (session_id, hours)
  );

  CREATE TABLE journal_entries (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES fast_sessions(id) ON DELETE SET NULL,
    mood INTEGER CHECK (mood IS NULL OR (mood BETWEEN 1 AND 5)),
    note TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK (mood IS NOT NULL OR note IS NOT NULL)
  );
  CREATE INDEX idx_journal_entries_user_created
    ON journal_entries(user_id, created_at DESC);
  `,

  // v2 — accusé de réception des précautions/contre-indications, affichées une
  // seule fois avant le tout premier jeûne (source : biochimie-approfondie.md).
  `
  ALTER TABLE users ADD COLUMN precautions_acknowledged_at INTEGER;
  `,

  // v3 — lien vers le compte Supabase à l'inscription (Phase 1). L'enregistrement
  // invité est mis à jour EN PLACE (is_guest=0, auth_user_id renseigné) — jamais
  // recréé, les données locales gardent leur user_id local (CLAUDE.md).
  `
  ALTER TABLE users ADD COLUMN auth_user_id TEXT;
  `,
];

export async function migrate(db: DbClient): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    // DDL + bump de version dans la MÊME transaction : un crash entre les deux
    // laisserait sinon user_version en arrière et rejouerait la migration (les
    // CREATE TABLE sans IF NOT EXISTS échoueraient, bloquant le bootstrap).
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version] as string);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
