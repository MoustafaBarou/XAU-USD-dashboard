import type { GoldState } from '../hooks/useGoldFeed';
import type { InstrumentMap, InstrumentKey } from '../services/priceService';
import { SymbolBadge } from './SymbolBadge';
import { usePreferences } from '../lib/PreferencesContext';

/**
 * Persistent top terminal bar (Bloomberg-style tape).
 * XAUUSD is live from the realtime gold feed. DXY, US10Y, US02Y, SPX, NASDAQ
 * and VIX are live from FMP when the request succeeds. The tape only renders
 * instruments that currently have live data — anything without a working feed
 * (premium-gated, no data, or no key configured) is filtered out of the view.
 * Instruments stay in the config (TAPE_ORDER) and reappear automatically the
 * moment a real feed delivers data, preserving tape order. Nothing is fabricated.
 */
interface Row {
  sym: string;
  value: number | null;
  delta: number | null;       // change %
  deltaAbs: number | null;    // change $ (absolute)
  unit: string;
  digits: number;
  live: boolean;
  unavailable: boolean;
}

function fmtVal(v: number | null, unit: string, digits: number) {
  if (v === null) return null;
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + (unit === '%' ? '%' : '');
}

// Focus instruments lead the tape; the broader macro set follows.
const TAPE_ORDER: { key: InstrumentKey; sym: string }[] = [
  { key: 'DXY', sym: 'DXY' },
  { key: 'VIX', sym: 'VIX' },
  { key: 'EURUSD', sym: 'EURUSD' },
  { key: 'GBPUSD', sym: 'GBPUSD' },
  { key: 'US10Y', sym: 'US10Y' },
  { key: 'US02Y', sym: 'US02Y' },
  { key: 'SPX', sym: 'SPX' },
  { key: 'NASDAQ', sym: 'NASDAQ' },
];

export function TerminalBar({ g, instruments }: { g: GoldState; instruments?: InstrumentMap | null }) {
  const { prefs } = usePreferences();
  const xauDelta = g.price !== null && g.dayOpen ? ((g.price - g.dayOpen) / g.dayOpen) * 100 : null;
  const xauDeltaAbs = g.price !== null && g.dayOpen ? g.price - g.dayOpen : null;
  const xauLive = g.status === 'connected' && g.price !== null;

  const rows: Row[] = [
    // XAU follows the user's decimal-precision preference; macro instruments
    // below keep their own instrument-defined digits (forex 4 / index 2).
    { sym: 'XAUUSD', value: g.price, delta: xauDelta, deltaAbs: xauDeltaAbs, unit: '', digits: prefs.decimalPrecision, live: xauLive, unavailable: !xauLive && g.status === 'error' },
  ];

  for (const t of TAPE_ORDER) {
    const q = instruments?.[t.key];
    rows.push({
      sym: t.sym,
      value: q?.value ?? null,
      delta: q?.changePct ?? null,
      deltaAbs: q?.changeAbs ?? null,
      unit: q?.unit ?? '',
      digits: q?.digits ?? 2,
      live: !!q?.available,
      unavailable: q ? !q.available : false,
    });
  }

  // Data-driven tape: only instruments with a working live feed are shown.
  // Filtering preserves TAPE_ORDER, so anything that gains a feed later
  // reappears in its configured position with no code change.
  const visible = rows.filter((it) => it.live && fmtVal(it.value, it.unit, it.digits) !== null);

  return (
    <div
      className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#03050899] backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-stretch overflow-x-auto scrollbar-thin">
        {visible.map((it) => {
          const dir = it.delta === null ? 0 : it.delta > 0 ? 1 : it.delta < 0 ? -1 : 0;
          const col = dir > 0 ? '#4ADE80' : dir < 0 ? '#FF4D6D' : '#8A93A6';
          const shown = fmtVal(it.value, it.unit, it.digits);
          return (
            <div key={it.sym} className="flex items-center gap-2.5 px-5 py-2.5 border-r border-white/[0.05] whitespace-nowrap shrink-0">
              <SymbolBadge symbol={it.sym} status="live" />
              <span className="font-sora font-700 text-[12px] tnum text-white">{shown}</span>
              {it.delta !== null && (
                <span className="text-[11px] tnum font-600" style={{ color: col }}>{it.delta >= 0 ? '+' : ''}{it.delta.toFixed(2)}%</span>
              )}
            </div>
          );
        })}
        <div className="ml-auto flex items-center px-5 text-[10px] uppercase tracking-[0.16em] text-muted/60 shrink-0">
          AURUM · live tape
        </div>
      </div>
    </div>
  );
}
