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
  date: string;          // date
  bias: string | null;
  setup: string | null;
  entry: number | null;
  exit: number | null;
  result: string | null;
  lessons: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  note: string | null;
  created_at: string;
}
