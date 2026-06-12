-- ════════════════════════════════════════════════════════════════════════
-- AURUM Phase 2.2 — user_settings
-- Per-user preferences (display, alerts, data source, MT5 bridge URL).
-- One row per user; RLS: a user can only read/write their own row.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.user_settings (
  user_id             uuid primary key references auth.users (id) on delete cascade,

  -- Display preferences
  decimal_precision   int     not null default 2,
  show_spread         boolean not null default true,
  reduced_motion      boolean not null default false,

  -- Alerts (in-app, fire while the app is open)
  price_alert_enabled boolean not null default false,
  price_alert_above   numeric,
  price_alert_below   numeric,
  bias_alert_enabled  boolean not null default false,

  -- Data source / feed
  feed_provider       text    not null default 'gold-api',
  mt5_bridge_url      text,

  updated_at          timestamptz not null default now()
);

-- ── Row Level Security ──────────────────────────────────────────────────
alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own"
  on public.user_settings for delete
  using (auth.uid() = user_id);
