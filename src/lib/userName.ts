import type { User } from '@supabase/supabase-js';

/**
 * Turns a slug-like handle into a human name: "moustafa_barou" -> "Moustafa
 * Barou", "john.doe" -> "John Doe". Separators (_ . -) become spaces and each
 * word is title-cased. Strings that are already spaced names pass through with
 * proper casing applied.
 */
export function humanizeName(raw: string): string {
  const cleaned = raw.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resolves the best human display name for the signed-in user, following the
 * priority: first_name + last_name -> display_name -> username -> email local
 * part. Reads from Supabase auth user_metadata (set at sign-up / profile edit).
 * Slug-like values (e.g. the "moustafa_barou" username) are humanized into a
 * proper-cased name. Returns 'Trader' only when no user is present.
 */
export function resolveDisplayName(user: User | null | undefined): string {
  if (!user) return 'Trader';
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

  const first = str(m.first_name);
  const last = str(m.last_name);
  if (first || last) return humanizeName([first, last].filter(Boolean).join(' '));

  const displayName = str(m.display_name) || str(m.full_name) || str(m.name);
  if (displayName) return humanizeName(displayName);

  const username = str(m.username);
  if (username) return humanizeName(username);

  if (user.email) return humanizeName(user.email.split('@')[0]);

  return 'Trader';
}

/** Time-of-day greeting in the user's local time. */
export function timeGreeting(d = new Date()): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 18) return 'Good Afternoon';
  if (h >= 18 && h < 24) return 'Good Evening';
  return 'Welcome Back';
}
