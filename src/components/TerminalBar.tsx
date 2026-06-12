import type { GoldState } from '../hooks/useGoldFeed';
import type { InstrumentMap, InstrumentKey } from '../services/priceService';

/**
 * Persistent top terminal bar (Bloomberg-style tape).
 * XAUUSD is live from the realtime gold feed. DXY, US10Y, US02Y, SPX, NASDAQ
 * and VIX are live from FMP when the request succeeds. When a feed is configured
 * but returns no data / is premium-gated, that instrument shows "DATA UNAVAILABLE".
 * When no key is configured at all it shows "no feed". Nothing is fabricated.
 */
interface Row {
  sym: string;
  value: number | null;
  delta: number | null;       // change %
  deltaAbs: number | null;    // change $ (absolute)
  unit: string;
  live: boolean;
  unavailable: boolean;
}

function fmtVal(v: number | null, unit: string) {
  if (v === null) return null;
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (unit === '%' ? '%' : '');
}

const TAPE_ORDER: { key: InstrumentKey; sym: string }[] = [
  { key: 'DXY', sym: 'DXY' },
  { key: 'US10Y', sym: 'US10Y' },
  { key: 'US02Y', sym: 'US02Y' },
  { key: 'SPX', sym: 'SPX' },
  { key: 'NASDAQ', sym: 'NASDAQ' },
  { key: 'VIX', sym: 'VIX' },
];

export function TerminalBar({ g, instruments }: { g: GoldState; instruments?: InstrumentMap | null }) {
  const xauDelta = g.price !== null && g.dayOpen ? ((g.price - g.dayOpen) / g.dayOpen) * 100 : null;
  const xauDeltaAbs = g.price !== null && g.dayOpen ? g.price - g.dayOpen : null;
  const xauLive = g.status === 'connected' && g.price !== null;

  const rows: Row[] = [
    { sym: 'XAUUSD', value: g.price, delta: xauDelta, deltaAbs: xauDeltaAbs, unit: '', live: xauLive, unavailable: !xauLive && g.status === 'error' },
  ];

  for (const t of TAPE_ORDER) {
    const q = instruments?.[t.key];
    rows.push({
      sym: t.sym,
      value: q?.value ?? null,
      delta: q?.changePct ?? null,
      deltaAbs: q?.changeAbs ?? null,
      unit: q?.unit ?? '',
      live: !!q?.available,
      unavailable: q ? !q.available : false,
    });
  }

  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#03050899] backdrop-blur-xl">
      <div className="flex items-stretch overflow-x-auto scrollbar-thin">
        {rows.map((it) => {
          const dir = it.delta === null ? 0 : it.delta > 0 ? 1 : it.delta < 0 ? -1 : 0;
          const col = dir > 0 ? '#4ADE80' : dir < 0 ? '#FF4D6D' : '#8A93A6';
          const shown = fmtVal(it.value, it.unit);
          return (
            <div key={it.sym} className="flex items-center gap-2.5 px-5 py-2.5 border-r border-white/[0.05] whitespace-nowrap shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full"
                  style={{ background: it.live ? '#4ADE80' : it.unavailable ? '#FF4D6D' : '#3A4250', boxShadow: it.live ? '0 0 7px #4ADE80' : 'none' }} />
                <span className="font-sora font-700 text-[11px] tracking-[0.08em] text-txt2">{it.sym}</span>
              </span>
              {it.live && shown ? (
                <>
                  <span className="font-sora font-700 text-[12px] tnum text-white">{shown}</span>
                  {it.delta !== null && (
                    <span className="text-[11px] tnum font-600" style={{ color: col }}>{it.delta >= 0 ? '+' : ''}{it.delta.toFixed(2)}%</span>
                  )}
                </>
              ) : it.unavailable ? (
                <span className="text-[9px] uppercase tracking-[0.12em] text-bear/80 font-700">data unavailable</span>
              ) : (
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted/50">no feed</span>
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
