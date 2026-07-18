-- Schéma cloud KAIROS (Phase 1) — miroir du schéma local SQLite.
-- Horodatages en bigint (ms epoch) identiques au local : mapping local↔cloud 1:1.
-- RLS activée partout : un utilisateur ne voit et n'écrit QUE ses données.

-- Profil applicatif lié à un compte Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  precautions_acknowledged_at bigint,
  created_at bigint not null,
  updated_at bigint not null
);

create table public.fast_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  protocol text not null check (protocol in ('16:8', '18:6', '20:4', 'OMAD', 'custom')),
  target_hours integer not null check (target_hours between 1 and 168),
  status text not null check (status in ('running', 'completed', 'cancelled')),
  started_at bigint not null,
  ended_at bigint,
  created_at bigint not null,
  updated_at bigint not null,
  check ((status = 'running') = (ended_at is null)),
  check (ended_at is null or ended_at >= started_at)
);
create index fast_sessions_user_started_idx
  on public.fast_sessions (user_id, started_at desc);
create unique index fast_sessions_one_running_idx
  on public.fast_sessions (user_id) where status = 'running';

create table public.phases_reached (
  id uuid primary key,
  session_id uuid not null references public.fast_sessions (id) on delete cascade,
  hours integer not null check (hours between 1 and 168),
  reached_at bigint not null,
  unique (session_id, hours)
);

create table public.journal_entries (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.fast_sessions (id) on delete set null,
  mood integer check (mood is null or (mood between 1 and 5)),
  note text,
  created_at bigint not null,
  updated_at bigint not null,
  check (mood is not null or note is not null)
);
create index journal_entries_user_created_idx
  on public.journal_entries (user_id, created_at desc);

-- Row Level Security.
alter table public.profiles enable row level security;
alter table public.fast_sessions enable row level security;
alter table public.phases_reached enable row level security;
alter table public.journal_entries enable row level security;

create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "fast_sessions_self" on public.fast_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal_entries_self" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- phases_reached : rattachées via la session parente.
create policy "phases_reached_self" on public.phases_reached
  for all using (
    exists (
      select 1 from public.fast_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.fast_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- Crée automatiquement un profil à l'inscription d'un compte.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  insert into public.profiles (id, created_at, updated_at) values (new.id, ms, ms);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
