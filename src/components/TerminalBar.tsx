import type { GoldState } from '../hooks/useGoldFeed';

/**
 * Persistent top terminal bar (Bloomberg-style tape).
 * XAUUSD is genuinely live from the price feed. The other instruments
 * (DXY, US10Y, US02Y, SPX, NASDAQ, VIX) have no live feed wired in, so they
 * render an explicit "no feed" state — never fabricated values. The structure
 * accepts live values the moment a feed is connected.
 */
interface Instrument {
  sym: string;
  value: number | null;
  delta: number | null;     // percent
  live: boolean;
}

function fmtVal(v: number | null) {
  return v === null ? '— — —' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TerminalBar({ g }: { g: GoldState }) {
  const xauDelta = g.price !== null && g.dayOpen ? ((g.price - g.dayOpen) / g.dayOpen) * 100 : null;

  const instruments: Instrument[] = [
    { sym: 'XAUUSD', value: g.price, delta: xauDelta, live: g.status === 'connected' && g.price !== null },
    { sym: 'DXY',    value: null, delta: null, live: false },
    { sym: 'US10Y',  value: null, delta: null, live: false },
    { sym: 'US02Y',  value: null, delta: null, live: false },
    { sym: 'SPX',    value: null, delta: null, live: false },
    { sym: 'NASDAQ', value: null, delta: null, live: false },
    { sym: 'VIX',    value: null, delta: null, live: false },
  ];

  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#03050899] backdrop-blur-xl">
      <div className="flex items-stretch overflow-x-auto scrollbar-thin">
        {instruments.map((it) => {
          const dir = it.delta === null ? 0 : it.delta > 0 ? 1 : it.delta < 0 ? -1 : 0;
          const col = dir > 0 ? '#00D98B' : dir < 0 ? '#FF4D6D' : '#8A93A6';
          return (
            <div key={it.sym}
              className="flex items-center gap-2.5 px-5 py-2.5 border-r border-white/[0.05] whitespace-nowrap shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full"
                  style={{ background: it.live ? '#00D98B' : '#3A4250', boxShadow: it.live ? '0 0 7px #00D98B' : 'none' }} />
                <span className="font-sora font-700 text-[11px] tracking-[0.08em] text-txt2">{it.sym}</span>
              </span>
              <span className="font-sora font-700 text-[12px] tnum" style={{ color: it.live ? '#fff' : '#4A5260' }}>
                {fmtVal(it.value)}
              </span>
              {it.live && it.delta !== null ? (
                <span className="text-[11px] tnum font-600" style={{ color: col }}>
                  {it.delta >= 0 ? '+' : ''}{it.delta.toFixed(2)}%
                </span>
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
