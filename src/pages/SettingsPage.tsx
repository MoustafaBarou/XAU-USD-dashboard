import { useEffect, useState, type ReactNode } from 'react';
import { PageHeader } from './PageShell';
import { Surface, Eyebrow, Toggle } from '../components/ui';
import { usePreferences } from '../lib/PreferencesContext';
import { useAuthContext } from '../lib/AuthContext';
import { TWELVEDATA_AVAILABLE, type ProviderId } from '../feed';

export function SettingsPage() {
  const { prefs, update, persisted, loaded } = usePreferences();
  const { user } = useAuthContext();

  return (
    <div className="pb-12">
      <PageHeader
        title="Settings"
        description="Display, alerts, data source and the VT Markets MT5 bridge — saved to your account."
      />

      {/* Persistence honesty banner */}
      {!persisted && (
        <div className="card px-4 py-3 mb-8 text-[12px] text-txt2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-warn shrink-0" />
          {user
            ? 'Supabase is not configured — changes apply this session only and are not saved.'
            : 'Sign in to save your preferences to your account. Changes apply this session only until you do.'}
        </div>
      )}

      {/* One column on phones/tablets; two columns from xl up so wide screens
          don't leave a thin strip of settings in a sea of black. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* ── 1. DISPLAY PREFERENCES ─────────────────────────────────── */}
        <Section eyebrow="Display Preferences" title="How prices and motion render across AURUM">
          <Row label="Decimal precision" hint="Applied to every XAU/USD price in the app (tape, widget, header).">
            <Segmented
              options={[{ v: 2, l: '2 · 0.00' }, { v: 3, l: '3 · 0.000' }]}
              value={prefs.decimalPrecision}
              onChange={(v) => update({ decimalPrecision: v })}
            />
          </Row>
          <Row label="Spread display" hint="Show the Bid/Ask spread figure on the live gold widget.">
            <Toggle on={prefs.showSpread} onChange={(v) => update({ showSpread: v })} />
          </Row>
          <Row label="Reduced motion" hint="Disable ambient animations and transitions (accessibility / focus).">
            <Toggle on={prefs.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
          </Row>
        </Section>

        {/* ── 2. ALERTS ──────────────────────────────────────────────── */}
        <Section
          eyebrow="Alerts"
          title="In-app price & bias notifications"
          note="Alerts fire as toasts while AURUM is open in this tab. There is no background or push delivery."
        >
          <Row label="Price alerts" hint="Trigger when XAU/USD crosses your thresholds.">
            <Toggle on={prefs.priceAlertEnabled} onChange={(v) => update({ priceAlertEnabled: v })} />
          </Row>
          {prefs.priceAlertEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-1">
              <NumberField
                label="Alert above" placeholder="e.g. 2400"
                value={prefs.priceAlertAbove}
                onCommit={(n) => update({ priceAlertAbove: n })}
              />
              <NumberField
                label="Alert below" placeholder="e.g. 2300"
                value={prefs.priceAlertBelow}
                onCommit={(n) => update({ priceAlertBelow: n })}
              />
            </div>
          )}
          <Row label="Bias-change alerts" hint="Notify when the live gold momentum bias flips (e.g. Bullish → Bearish).">
            <Toggle on={prefs.biasAlertEnabled} onChange={(v) => update({ biasAlertEnabled: v })} />
          </Row>
        </Section>

        {/* ── 3. DATA SOURCE ─────────────────────────────────────────── */}
        <Section
          eyebrow="Data Source"
          title="Live XAU/USD feed provider"
          note="The dashboard reads from the selected feed via the abstraction layer. Only genuinely available feeds can be selected — no feed is faked."
        >
          <div className="space-y-3">
            <ProviderCard
              id="gold-api" active={prefs.feedProvider === 'gold-api'}
              name="gold-api.com" sub="Keyless XAU spot · REST poll" status="connected"
              onSelect={() => update({ feedProvider: 'gold-api' })}
            />
            <ProviderCard
              id="twelvedata" active={prefs.feedProvider === 'twelvedata'}
              name="Twelve Data" sub="WebSocket · requires VITE_TWELVEDATA_API_KEY"
              status={TWELVEDATA_AVAILABLE ? 'connected' : 'unavailable'}
              statusText={TWELVEDATA_AVAILABLE ? undefined : 'not connected — no API key'}
              onSelect={TWELVEDATA_AVAILABLE ? () => update({ feedProvider: 'twelvedata' }) : undefined}
            />
            <ProviderCard
              id="mt5-bridge" active={prefs.feedProvider === 'mt5-bridge'}
              name="VT Markets MT5 (bridge)" sub="True broker bid/ask via your bridge relay"
              status={prefs.mt5BridgeUrl ? 'experimental' : 'unavailable'}
              statusText={prefs.mt5BridgeUrl ? 'URL set · not verified' : 'not connected — set the bridge URL below'}
              onSelect={prefs.mt5BridgeUrl ? () => update({ feedProvider: 'mt5-bridge' }) : undefined}
            />
          </div>
        </Section>

        {/* ── 4. VT MARKETS MT5 BRIDGE ───────────────────────────────── */}
        <Section
          eyebrow="VT Markets MT5 Bridge"
          title="Connect your MT5 feed bridge"
          note="GitHub Pages is static, so MT5 is reached via a WebSocket relay you host. The bridge is not running yet — enter its URL when it is live. No connection is faked."
        >
          <BridgeField
            value={prefs.mt5BridgeUrl}
            onCommit={(url) => update({ mt5BridgeUrl: url })}
          />
        </Section>
      </div>

      {!loaded && persisted && (
        <div className="text-[12px] text-muted mt-6">Loading your saved settings…</div>
      )}
    </div>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────
function Section({ eyebrow, title, note, children }: { eyebrow: string; title: string; note?: string; children: ReactNode }) {
  return (
    <Surface className="p-6">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-sora font-700 text-[16px] text-txt mt-2">{title}</h2>
      {note && <p className="text-[12px] text-txt2/80 mt-1.5 leading-relaxed max-w-xl">{note}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </Surface>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1">
      <div className="min-w-0">
        <div className="font-sora font-600 text-[13px] text-txt">{label}</div>
        {hint && <div className="text-[11px] text-muted mt-0.5 leading-snug">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends number | string>({ options, value, onChange }: {
  options: { v: T; l: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
      {options.map((o) => {
        const on = o.v === value;
        return (
          <button
            key={String(o.v)} onClick={() => onChange(o.v)}
            className={`px-3.5 py-1.5 text-[12px] font-600 tnum transition-colors ${on ? 'text-bg bg-greenBright' : 'text-txt2 hover:text-txt'}`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function NumberField({ label, value, placeholder, onCommit }: {
  label: string; value: number | null; placeholder?: string; onCommit: (n: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => { setText(value === null ? '' : String(value)); }, [value]);

  const commit = () => {
    const t = text.trim();
    if (t === '') { onCommit(null); return; }
    const n = Number(t);
    if (isFinite(n) && n > 0) onCommit(+n.toFixed(2));
  };
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</label>
      <input
        type="number" inputMode="decimal" value={text} placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-full mt-1.5 bg-black/30 border border-white/10 rounded-xl px-3.5 py-2 text-[14px] tnum text-txt placeholder:text-muted/50 focus:border-gold/50 outline-none transition-colors"
      />
    </div>
  );
}

function ProviderCard({ active, name, sub, status, statusText, onSelect }: {
  id: ProviderId; active: boolean; name: string; sub: string;
  status: 'connected' | 'unavailable' | 'experimental'; statusText?: string; onSelect?: () => void;
}) {
  const selectable = !!onSelect;
  const dot = status === 'connected' ? '#4ADE80' : status === 'experimental' ? '#FFC857' : '#8A93A6';
  const label = statusText ?? (status === 'connected' ? 'connected' : status);
  return (
    <button
      onClick={onSelect} disabled={!selectable}
      className={`w-full text-left card px-4 py-3.5 flex items-center justify-between gap-4 transition-colors
        ${active ? 'border-greenBright/50' : selectable ? 'card-hover cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
      style={active ? { borderColor: 'rgba(74,222,128,0.5)' } : undefined}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-sora font-700 text-[13px] text-txt">{name}</span>
          {active && <span className="text-[10px] font-700 text-greenBright tracking-wide">ACTIVE</span>}
        </div>
        <div className="text-[11px] text-muted mt-0.5 truncate">{sub}</div>
      </div>
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="h-2 w-2 rounded-full" style={{ background: dot, boxShadow: status === 'connected' ? `0 0 7px ${dot}` : 'none' }} />
        <span className="text-[10px] font-700 tracking-wide" style={{ color: dot }}>{label.toUpperCase()}</span>
      </span>
    </button>
  );
}

function BridgeField({ value, onCommit }: { value: string | null; onCommit: (url: string | null) => void }) {
  const [text, setText] = useState(value ?? '');
  const [saved, setSaved] = useState(false);
  useEffect(() => { setText(value ?? ''); }, [value]);

  const valid = text.trim() === '' || /^wss?:\/\//i.test(text.trim());
  const commit = () => {
    const t = text.trim();
    if (t !== '' && !/^wss?:\/\//i.test(t)) return;
    onCommit(t === '' ? null : t);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.16em] text-muted">Bridge WebSocket URL</label>
      <div className="flex gap-2 mt-1.5">
        <input
          type="text" value={text} placeholder="wss://your-mt5-bridge.example/ws"
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3.5 py-2 text-[14px] text-txt placeholder:text-muted/50 focus:border-gold/50 outline-none transition-colors"
        />
        <button
          onClick={commit} disabled={!valid}
          className="font-sora font-700 text-[12px] tracking-wide text-bg bg-gradient-to-r from-goldBright to-gold rounded-xl px-4 transition-all hover:opacity-90 disabled:opacity-40"
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {!valid && <div className="text-[11px] text-bear mt-1.5">URL must start with ws:// or wss://</div>}
      <div className="flex items-center gap-2 mt-3 text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: value ? '#FFC857' : '#8A93A6' }} />
        <span className="text-muted">
          {value ? 'URL saved · bridge not verified — selectable under Data Source as an experimental feed.' : 'Not connected — enter the URL when your bridge is live.'}
        </span>
      </div>
    </div>
  );
}
