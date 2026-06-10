import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { analyse, type AnalystRead } from '../data/analyst';
import type { GoldState } from '../hooks/useGoldFeed';
import { Eyebrow } from './ui';

function biasColor(b: string) { return b === 'Bullish' ? '#00D98B' : b === 'Bearish' ? '#FF4D6D' : '#FFC857'; }

/** AI Overview — regenerated dynamically from live price data. Open, borderless. */
export function AiOverview({ g }: { g: GoldState }) {
  const [read, setRead] = useState<AnalystRead>(() => analyse(g));
  useEffect(() => { setRead(analyse(g)); }, [g.price, g.status, g.tickCount, g.high, g.low]);

  const c = biasColor(read.bias);
  const rows: [string, string][] = [
    ['What changed', read.whatChanged],
    ['Why it changed', read.whyChanged],
    ['Why it matters for gold', read.whyItMatters],
    ['What to watch next', read.watchNext],
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">AI Overview</h3>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: read.live ? '#00D98B' : '#FF4D6D', boxShadow: read.live ? '0 0 8px #00D98B' : 'none' }} />
          <Eyebrow>{read.live ? 'Live · regenerating' : 'Feed offline'}</Eyebrow>
        </span>
      </div>

      <motion.p key={read.headline} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
        className="border-l-2 pl-5 mb-8 font-500 text-txt leading-relaxed" style={{ borderColor: c, fontSize: 'clamp(18px,1.9vw,24px)' }}>
        {read.headline}.
      </motion.p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 mb-2">{k}</div>
            <motion.div key={v} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-[14px] leading-relaxed text-txt2">{v}</motion.div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-muted/55 mt-6 leading-relaxed max-w-3xl">
        Generated from the live XAU/USD stream (direction, session move, momentum, range, volatility, tick cadence) blended with the Driver Matrix. No values are invented for drivers without a live feed.
      </div>
    </section>
  );
}
