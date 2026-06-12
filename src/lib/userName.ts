import type { User } from '@supabase/supabase-js';

/**
 * Resolves the best human display name for the signed-in user, following the
 * priority: display_name -> first_name + last_name -> username -> email local
 * part. Reads from Supabase auth user_metadata (set at sign-up / profile edit).
 * Returns 'Trader' only when no user is present.
 */
export function resolveDisplayName(user: User | null | undefined): string {
  if (!user) return 'Trader';
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

  const displayName = str(m.display_name) || str(m.full_name) || str(m.name);
  if (displayName) return displayName;

  const first = str(m.first_name);
  const last = str(m.last_name);
  if (first || last) return [first, last].filter(Boolean).join(' ');

  const username = str(m.username);
  if (username) return username;

  if (user.email) return user.email.split('@')[0];

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
