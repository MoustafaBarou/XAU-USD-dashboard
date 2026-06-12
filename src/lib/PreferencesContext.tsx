import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase, SUPABASE_CONFIGURED, type UserSettings } from './supabase';
import { useAuthContext } from './AuthContext';
import type { ProviderId } from '../feed';

// ── App-wide user preferences ─────────────────────────────────────────────
// Persisted per user in public.user_settings (RLS-protected). Guests and
// signed-out users get in-memory defaults so the UI always works; their
// changes simply aren't persisted (made clear in the Settings UI).

export interface Preferences {
  decimalPrecision: number;
  showSpread: boolean;
  reducedMotion: boolean;
  priceAlertEnabled: boolean;
  priceAlertAbove: number | null;
  priceAlertBelow: number | null;
  biasAlertEnabled: boolean;
  feedProvider: ProviderId;
  mt5BridgeUrl: string | null;
}

export const DEFAULT_PREFS: Preferences = {
  decimalPrecision: 2,
  showSpread: true,
  reducedMotion: false,
  priceAlertEnabled: false,
  priceAlertAbove: null,
  priceAlertBelow: null,
  biasAlertEnabled: false,
  feedProvider: 'gold-api',
  mt5BridgeUrl: null,
};

function fromRow(r: UserSettings): Preferences {
  return {
    decimalPrecision: r.decimal_precision ?? 2,
    showSpread: r.show_spread ?? true,
    reducedMotion: r.reduced_motion ?? false,
    priceAlertEnabled: r.price_alert_enabled ?? false,
    priceAlertAbove: r.price_alert_above ?? null,
    priceAlertBelow: r.price_alert_below ?? null,
    biasAlertEnabled: r.bias_alert_enabled ?? false,
    feedProvider: (r.feed_provider as ProviderId) ?? 'gold-api',
    mt5BridgeUrl: r.mt5_bridge_url ?? null,
  };
}

function toRow(p: Preferences, userId: string): UserSettings {
  return {
    user_id: userId,
    decimal_precision: p.decimalPrecision,
    show_spread: p.showSpread,
    reduced_motion: p.reducedMotion,
    price_alert_enabled: p.priceAlertEnabled,
    price_alert_above: p.priceAlertAbove,
    price_alert_below: p.priceAlertBelow,
    bias_alert_enabled: p.biasAlertEnabled,
    feed_provider: p.feedProvider,
    mt5_bridge_url: p.mt5BridgeUrl,
    updated_at: new Date().toISOString(),
  };
}

interface PreferencesValue {
  prefs: Preferences;
  /** Merge a partial update; persists to Supabase when signed in. */
  update: (patch: Partial<Preferences>) => void;
  /** Format a price with the user's decimal precision (or an explicit override). */
  formatPrice: (n: number | null | undefined, digits?: number) => string;
  loaded: boolean;       // true once the user's row (if any) has resolved
  saving: boolean;
  persisted: boolean;    // true when changes are actually being saved (signed in + configured)
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const persisted = SUPABASE_CONFIGURED && !!user;

  // Load the signed-in user's settings (or reset to defaults on sign-out).
  useEffect(() => {
    let alive = true;
    if (!persisted || !user) {
      setPrefs(DEFAULT_PREFS);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setPrefs(data ? fromRow(data as UserSettings) : DEFAULT_PREFS);
        setLoaded(true);
      });
    return () => { alive = false; };
  }, [user, persisted]);

  // Apply reduced-motion globally by toggling a class on <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', prefs.reducedMotion);
  }, [prefs.reducedMotion]);

  const update = useCallback((patch: Partial<Preferences>) => {
    const next = { ...prefsRef.current, ...patch };
    setPrefs(next);
    if (!persisted || !user) return;   // in-memory only for guests
    setSaving(true);
    supabase
      .from('user_settings')
      .upsert(toRow(next, user.id), { onConflict: 'user_id' })
      .then(() => setSaving(false));
  }, [persisted, user]);

  const formatPrice = useCallback(
    (n: number | null | undefined, digits?: number) => {
      if (n === null || n === undefined || !isFinite(n)) return '--';
      const d = digits ?? prefs.decimalPrecision;
      return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    [prefs.decimalPrecision],
  );

  return (
    <PreferencesContext.Provider value={{ prefs, update, formatPrice, loaded, saving, persisted }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within <PreferencesProvider>');
  return ctx;
}
