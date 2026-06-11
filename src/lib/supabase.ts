import { createClient } from '@supabase/supabase-js';

// ── Supabase client ───────────────────────────────────────────────────────
// The anon (publishable) key is safe to ship in the browser — it only grants
// what Row Level Security allows. Never put the service_role key here.
//
// Required env vars (add to .env and to your GitHub Actions build):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when both env vars are present, so the UI can show a clear state. */
export const SUPABASE_CONFIGURED = !!url && !!anonKey;

if (!SUPABASE_CONFIGURED && import.meta.env.DEV) {
  // Surface misconfiguration loudly in dev, never crash the app.
  console.warn('[AURUM] Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// We still construct a client with safe fallbacks so imports never throw;
// calls will simply fail with a clear auth error if not configured.
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,        // keep the session in localStorage
      autoRefreshToken: true,      // refresh JWT automatically
      detectSessionInUrl: true,    // handle magic-link / OAuth redirects
      storageKey: 'aurum-auth',
    },
  }
);

// ── Row types (match the SQL migrations) ──────────────────────────────────
export interface Profile {
  id: string;            // = auth.users.id
  username: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string | null;          // entry date/datetime (ISO)
  bias: string | null;          // legacy; kept in sync with direction
  setup: string | null;
  entry: number | null;         // legacy; kept in sync with entry_price
  exit: number | null;          // legacy; kept in sync with exit_price
  result: string | null;        // stores computed Net P/L as text
  lessons: string | null;       // legacy; kept in sync with notes
  created_at: string;
  instrument: string | null;
  direction: string | null;     // 'Long' | 'Short'
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  fees: number | null;
  exit_date: string | null;     // ISO
  notes: string | null;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  note: string | null;
  created_at: string;
}
