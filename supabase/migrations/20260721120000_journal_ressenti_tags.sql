-- Phase 2 (bien-être approfondi) : ressentis du journal.
-- Tableau JSON de clés du vocabulaire contrôlé (RESSENTI_TAGS côté app), base de
-- la corrélation ressenti ↔ phase biochimique. Miroir cloud de la migration
-- locale v4 (src/db/migrations.ts).

alter table public.journal_entries
  add column if not exists tags jsonb not null default '[]'::jsonb;

-- Une entrée peut désormais ne porter QUE des ressentis (ni humeur ni note) :
-- on assouplit la contrainte de contenu en conséquence. `if exists` sur les deux
-- drops rend la migration ré-exécutable sans erreur (ancienne contrainte
-- auto-nommée journal_entries_check, puis la nouvelle si rejouée).
alter table public.journal_entries
  drop constraint if exists journal_entries_check;

alter table public.journal_entries
  drop constraint if exists journal_entries_content_check;

alter table public.journal_entries
  add constraint journal_entries_content_check
  check (mood is not null or note is not null or jsonb_array_length(tags) > 0);
