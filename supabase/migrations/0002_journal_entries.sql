-- ════════════════════════════════════════════════════════════════════════
-- AURUM Phase 2.1 — journal_entries
-- A user's trade journal. RLS: users only see/modify their own rows.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null default current_date,
  bias       text,
  setup      text,
  entry      numeric,
  exit       numeric,
  result     text,
  lessons    text,
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_user on public.journal_entries (user_id, date desc);

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.journal_entries enable row level security;

drop policy if exists "journal_select_own" on public.journal_entries;
create policy "journal_select_own"
  on public.journal_entries for select
  using (auth.uid() = user_id);

drop policy if exists "journal_insert_own" on public.journal_entries;
create policy "journal_insert_own"
  on public.journal_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "journal_update_own" on public.journal_entries;
create policy "journal_update_own"
  on public.journal_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "journal_delete_own" on public.journal_entries;
create policy "journal_delete_own"
  on public.journal_entries for delete
  using (auth.uid() = user_id);
