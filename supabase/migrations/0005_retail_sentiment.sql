-- ════════════════════════════════════════════════════════════════════════
-- AURUM — retail_sentiment
-- Single-row cache of the Myfxbook Community Outlook (XAU/USD retail sentiment),
-- written by the scheduled GitHub Actions job (scripts/fetch-sentiment.mjs) and
-- read by /api/myfxbook-sentiment. The job writes with the service-role key
-- (bypasses RLS); the site only ever reads.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.retail_sentiment (
  symbol           text primary key,
  long_percentage  numeric,
  short_percentage numeric,
  long_volume      numeric,
  short_volume     numeric,
  long_positions   numeric,
  short_positions  numeric,
  total_positions  numeric,
  avg_long_price   numeric,
  avg_short_price  numeric,
  updated_at       timestamptz not null default now()
);

alter table public.retail_sentiment enable row level security;

-- Public read (anon + authenticated): the site only ever reads this table.
drop policy if exists "retail_sentiment_read" on public.retail_sentiment;
create policy "retail_sentiment_read"
  on public.retail_sentiment
  for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies are created on purpose. The scheduled job
-- writes using the service-role key, which bypasses RLS entirely. Without a
-- write policy, anon/authenticated clients therefore cannot write — only the job can.
