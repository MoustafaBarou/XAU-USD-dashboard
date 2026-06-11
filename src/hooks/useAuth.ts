import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;            // true while the initial session is resolving
  configured: boolean;         // false if env vars missing
}

export interface AuthActions {
  register: (email: string, password: string, username?: string) => Promise<{ error: string | null }>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

/**
 * Auth hook — register / login / logout with automatic session persistence.
 * Session state stays in sync via onAuthStateChange (the recommended v2 pattern),
 * so a page refresh keeps the user signed in (token lives in localStorage).
 */
export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    // 1) Load any persisted session on mount.
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 2) Stay in sync with sign-in / sign-out / token-refresh events.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!alive) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const register = useCallback(async (email: string, password: string, username?: string) => {
    if (!SUPABASE_CONFIGURED) return { error: 'Supabase is not configured.' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: username ? { username } : undefined },
    });
    return { error: error?.message ?? null };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!SUPABASE_CONFIGURED) return { error: 'Supabase is not configured.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, session, loading, configured: SUPABASE_CONFIGURED, register, login, logout };
}
