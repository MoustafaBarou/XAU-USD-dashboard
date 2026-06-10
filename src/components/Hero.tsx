import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GoldBar } from './Brand';
import type { GoldState } from '../hooks/useGoldFeed';

function fmt(n: number | null, d = 2) {
  return n === null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function ago(t: number | null) {
  if (!t) return '—';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  return s < 1 ? 'now' : `${s}s ago`;
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
}

/**
 * XAUUSD Hero — the dominant focus of the platform (~40% of the viewport).
 * Oversized logo, title and live price. Everything else is secondary.
 */
export function Hero({ g }: { g: GoldState }) {
  const [, force] = useState(0);
  const flashRef = useRef<HTMLDivElement>(null);
  const lastPrice = useRef<number | null>(null);
  useEffect(() => { const i = setInterval(() => force((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (g.price === null || !flashRef.current) return;
    if (lastPrice.current !== null && g.price !== lastPrice.current) {
      const up = g.price > lastPrice.current;
      flashRef.current.classList.remove('flash-up', 'flash-down');
      void flashRef.current.offsetWidth;
      flashRef.current.classList.add(up ? 'flash-up' : 'flash-down');
    }
    lastPrice.current = g.price;
  }, [g.price]);

  const disconnected = g.status === 'error' || g.status === 'disconnected';
  const open = g.dayOpen;
  const dayChange = g.price !== null && open !== null ? g.price - open : null;
  const dayPct = dayChange !== null && open ? (dayChange / open) * 100 : null;
  const dirColor = g.direction === 'up' ? '#00D98B' : g.direction === 'down' ? '#FF4D6D' : '#E6C65B';

  return (
    <section className="min-h-[40vh] flex flex-col justify-center py-10">
      {/* greeting eyebrow */}
      <div className="flex items-center justify-between mb-8">
        <div className="eyebrow">{greeting()}, Trader · Gold Intelligence Assistant</div>
        {!disconnected && (
          <div className="flex items-center gap-2 text-[12px] text-bull">
            <span className="h-2 w-2 rounded-full bg-bull animate-pulse" style={{ boxShadow: '0 0 10px #00D98B' }} />
            Live · {g.direction === 'up' ? 'rising' : g.direction === 'down' ? 'falling' : 'flat'}
          </div>
        )}
      </div>

      {/* brand lockup — oversized */}
      <div className="flex items-center gap-7 mb-10">
        <GoldBar size={120} />
        <div className="leading-none">
          <h1 className="font-sora font-800 tracking-tight gold-text leading-[0.85]" style={{ fontSize: 'clamp(64px,9vw,128px)' }}>XAUUSD</h1>
          <p className="text-txt2 mt-4 font-500" style={{ fontSize: 'clamp(16px,1.7vw,22px)' }}>Gold Spot vs US Dollar</p>
        </div>
      </div>

      {/* live price — the dominant number */}
      {disconnected ? (
        <div className="py-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-bear animate-pulse" />
            <div>
              <div className="font-sora font-800 text-bear tracking-wide leading-none" style={{ fontSize: 'clamp(30px,4.5vw,52px)' }}>NO LIVE MARKET FEED CONNECTED</div>
              <div className="text-[14px] text-muted mt-4 max-w-2xl leading-relaxed">
                Price updates have stopped. {g.detail ? `Reason: ${g.detail}. ` : ''}No simulated data is shown. The terminal will reconnect automatically on the next cycle.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div ref={flashRef} className="rounded-3xl -mx-4 px-4 py-3 transition-colors">
          <div className="eyebrow mb-3">Current Gold Price · XAU/USD</div>
          <div className="flex items-end gap-7 flex-wrap">
            <motion.div key={g.price ?? 0} initial={{ opacity: 0.5, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="font-sora font-800 leading-[0.82] tnum tracking-tight"
              style={{ color: dirColor, fontSize: 'clamp(88px,15vw,200px)' }}>
              {fmt(g.price)}
            </motion.div>
            <div className="mb-6 flex flex-col gap-3">
              <span className="tnum font-700 leading-none" style={{ fontSize: 'clamp(22px,2.6vw,34px)', color: dayChange === null ? '#8A93A6' : dayChange >= 0 ? '#00D98B' : '#FF4D6D' }}>
                {dayChange === null ? '—' : `${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}`}
              </span>
              <span className="tnum leading-none" style={{ fontSize: 'clamp(15px,1.5vw,20px)', color: dayPct === null ? '#8A93A6' : dayPct >= 0 ? '#00D98B' : '#FF4D6D' }}>
                {dayPct === null ? '' : `${dayPct >= 0 ? '+' : ''}${dayPct.toFixed(2)}% session`}
              </span>
            </div>
          </div>

          {/* quote strip */}
          <div className="flex flex-wrap items-center gap-y-4 mt-10">
            <Q label="Bid" v={fmt(g.bid)} color="#FF4D6D" /><Div />
            <Q label="Ask" v={fmt(g.ask)} color="#00D98B" /><Div />
            <Q label="Spread" v={fmt(g.spread)} /><Div />
            <Q label="ATR" v={fmt(g.atr)} /><Div />
            <Q label="Ticks" v={g.tickCount.toLocaleString()} /><Div />
            <Q label="Last Tick" v={ago(g.lastTickTime)} /><Div />
            <Q label="High" v={fmt(g.high)} /><Div />
            <Q label="Low" v={fmt(g.low)} />
          </div>
        </div>
      )}
    </section>
  );
}

function Q({ label, v, color }: { label: string; v: string; color?: string }) {
  return (
    <div className="flex flex-col px-6 first:pl-0">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted mb-2">{label}</span>
      <span className="font-sora font-700 text-[22px] tnum leading-none" style={{ color: color ?? '#fff' }}>{v}</span>
    </div>
  );
}
function Div() { return <span className="h-10 w-px bg-white/[0.07]" />; }
