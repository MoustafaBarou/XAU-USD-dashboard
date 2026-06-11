-- ════════════════════════════════════════════════════════════════════════
-- AURUM Phase 2.1 — watchlists
-- Symbols a user is tracking. RLS: users only see/modify their own rows.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.watchlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  symbol     text not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create index if not exists idx_watchlist_user on public.watchlists (user_id, created_at desc);

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.watchlists enable row level security;

drop policy if exists "watchlist_select_own" on public.watchlists;
create policy "watchlist_select_own"
  on public.watchlists for select
  using (auth.uid() = user_id);

drop policy if exists "watchlist_insert_own" on public.watchlists;
create policy "watchlist_insert_own"
  on public.watchlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "watchlist_update_own" on public.watchlists;
create policy "watchlist_update_own"
  on public.watchlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "watchlist_delete_own" on public.watchlists;
create policy "watchlist_delete_own"
  on public.watchlists for delete
  using (auth.uid() = user_id);
