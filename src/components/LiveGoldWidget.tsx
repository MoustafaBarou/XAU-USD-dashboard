import { useMemo, useState } from 'react';
import { AreaChart, Area, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useLiveGold } from '../lib/liveGold';

const fmt2 = (n: number | null) => (n === null ? '--' : n.toFixed(2));
const fmtSigned = (n: number | null) => (n === null ? '--' : (n >= 0 ? '+' : '') + n.toFixed(2));
const fmtPct = (n: number | null) => (n === null ? '--' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%');

type TF = '1H' | '4H' | '1D';
const TF_MS: Record<TF, number> = { '1H': 3_600_000, '4H': 14_400_000, '1D': 86_400_000 };

export function LiveGoldWidget() {
  const g = useLiveGold();
  const [tf, setTf] = useState<TF>('1H');

  const up = (g.changeAbs ?? 0) >= 0;
  const accent = g.changeAbs === null ? '#8A93A6' : up ? '#00D98B' : '#FF4D6D';

  const chartData = useMemo(() => {
    if (!g.history.length) return [];
    const cutoff = Date.now() - TF_MS[tf];
    const pts = g.history.filter((h) => h.t >= cutoff);
    const src = pts.length >= 2 ? pts : g.history;
    return src.map((h) => ({ t: h.t, p: h.p }));
  }, [g.history, tf]);

  const yDomain = useMemo(() => {
    if (chartData.length < 2) return ['auto', 'auto'] as const;
    const ps = chartData.map((d) => d.p);
    const min = Math.min(...ps), max = Math.max(...ps);
    const pad = (max - min) * 0.15 || 0.5;
    return [min - pad, max + pad] as [number, number];
  }, [chartData]);

  return (
    <div className="surface surface-lit p-5 md:p-6">
      {/* header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="eyebrow">XAU/USD</span>
            <MarketBadge open={g.marketOpen} live={g.isLive} />
          </div>
          <div className="flex items-end gap-3 mt-2">
            <span className="font-sora font-800 tnum leading-none" style={{ fontSize: 'clamp(30px,4vw,44px)', color: '#FFFFFF' }}>
              {g.price === null ? 'NO FEED' : g.price.toFixed(2)}
            </span>
            <span className="font-sora font-700 tnum pb-1" style={{ color: accent, fontSize: '16px' }}>
              {fmtPct(g.changePct)}
            </span>
          </div>
          <div className="mt-1 text-[13px] tnum" style={{ color: accent }}>
            {fmtSigned(g.changeAbs)} {g.changeBasis === 'daily' ? 'Today' : 'this session'}
          </div>
        </div>

        {/* bid / ask / spread block */}
        <div className="grid grid-cols-3 gap-x-5 gap-y-1 text-right">
          <Stat label="Bid" value={fmt2(g.bid)} />
          <Stat label="Ask" value={fmt2(g.ask)} />
          <Stat label="Spread" value={fmt2(g.spread)} />
          <Stat label="High" value={fmt2(g.high)} />
          <Stat label="Low" value={fmt2(g.low)} />
          <Stat label="Feed" value={g.provider === 'Twelve Data' ? 'TD WS' : 'spot'} subtle />
        </div>
      </div>

      {/* mini live chart */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted/70">Live ({g.provider})</span>
          <div className="flex gap-1">
            {(['1H', '4H', '1D'] as TF[]).map((t) => (
              <button key={t} onClick={() => setTf(t)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-600 transition-colors ${
                  tf === t ? 'text-bg bg-greenBright' : 'text-txt2 hover:text-txt border border-white/10'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 120 }}>
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="lgFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={yDomain} />
                <Tooltip
                  contentStyle={{ background: '#0D1218', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={() => ''}
                  formatter={(v) => [Number(v).toFixed(2), 'XAU/USD']}
                />
                <Area type="monotone" dataKey="p" stroke={accent} strokeWidth={2} fill="url(#lgFill)" isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[12px] text-muted/60">
              {g.price === null ? 'Waiting for live feed...' : 'Building live chart from real ticks...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted/70">{label}</div>
      <div className={`font-sora font-700 tnum text-[14px] ${subtle ? 'text-txt2' : 'text-txt'}`}>{value}</div>
    </div>
  );
}

function MarketBadge({ open, live }: { open: boolean; live: boolean }) {
  if (open && live) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-700">
        <span className="h-2 w-2 rounded-full bg-greenBright animate-pulse" style={{ boxShadow: '0 0 8px #4ADE80' }} />
        <span className="text-greenBright">LIVE</span>
      </span>
    );
  }
  if (!open) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-700">
        <span className="h-2 w-2 rounded-full bg-bear" />
        <span className="text-bear">CLOSED</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-700">
      <span className="h-2 w-2 rounded-full bg-warn" />
      <span className="text-warn">CONNECTING</span>
    </span>
  );
}
