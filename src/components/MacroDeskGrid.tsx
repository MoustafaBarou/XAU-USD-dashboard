import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Eyebrow } from './ui';
import type { GoldState } from '../hooks/useGoldFeed';
import type { InstrumentMap } from '../services/priceService';
import { useEconomicCalendar } from '../hooks/useEconomicCalendar';
import {
  riskSentimentDriver, goldMomentumDriver, inflationDriver, noFeedDrivers,
  compositeBias, type Bias, type DriverRead,
} from '../lib/macroBias';

function biasColor(b: Bias) {
  if (b === 'Strong Bullish' || b === 'Bullish') return '#4ADE80';
  if (b === 'Strong Bearish' || b === 'Bearish') return '#FF4D6D';
  return '#FFC857';
}

function Card({ d }: { d: DriverRead }) {
  const bc = biasColor(d.bias);
  return (
    <div className="card card-hover p-4 transition-colors">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-sora font-800 text-[15px] text-txt tracking-wide truncate">{d.title}</span>
          {d.available && <span className="h-1.5 w-1.5 rounded-full bg-greenBright animate-pulse shrink-0" style={{ boxShadow: '0 0 6px #4ADE80' }} />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!d.available && <span className="text-[10px] uppercase tracking-[0.12em] text-muted/60">No Feed</span>}
          <span className="text-[10px] font-700 px-2 py-[2px] rounded-full uppercase tracking-wide"
            style={{ color: bc, background: `${bc}1a`, border: `1px solid ${bc}40` }}>{d.bias}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted">{d.available ? d.headline : 'Strength'}</span>
        <span className="text-[11px] tnum text-txt2">{d.available ? `${d.strength}%` : '--'}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-3">
        <div className="h-full rounded-full" style={{ width: `${d.available ? d.strength : 0}%`, background: 'linear-gradient(90deg,#15803D,#4ADE80)' }} />
      </div>

      <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-greenBright text-[11px]">✦</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-greenSoft font-700">Mechanical Read</span>
          </div>
          <span className="text-[9px] uppercase tracking-[0.1em] text-muted/60">{d.source}</span>
        </div>
        <p className="text-[12px] leading-relaxed text-txt2/85">{d.detail}</p>
      </div>
    </div>
  );
}

export function MacroDeskGrid({ g, instruments }: { g: GoldState; instruments?: InstrumentMap | null }) {
  const cal = useEconomicCalendar();
  const events = cal.status === 'ok' ? cal.events : null;

  const { drivers, composite } = useMemo(() => {
    const live: DriverRead[] = [
      goldMomentumDriver(g.price, g.dayOpen, g.status === 'connected'),
      riskSentimentDriver(instruments ?? null),
      inflationDriver(events),
    ];
    const all = [...live, ...noFeedDrivers()];
    return { drivers: all, composite: compositeBias(all) };
  }, [g.price, g.dayOpen, g.status, instruments, events]);

  const cb = biasColor(composite.bias);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-greenBright">↗</span>
            <h3 className="font-sora font-700 text-[16px] text-txt">Macro Desk</h3>
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted mt-0.5">Mechanical Bias Engine</div>
        </div>
        <Eyebrow>XAU/USD focus</Eyebrow>
      </div>

      {/* composite bias summary - computed only from live drivers */}
      <div className="card p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted">Composite Bias</span>
          <span className="text-[10px] font-700 px-2.5 py-[3px] rounded-full uppercase tracking-wide"
            style={{ color: cb, background: `${cb}1a`, border: `1px solid ${cb}40` }}>{composite.bias}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-muted uppercase tracking-[0.12em] text-[10px]">Confidence <span className="tnum text-txt2 font-700">{composite.confidence}%</span></span>
          <span className="text-muted uppercase tracking-[0.12em] text-[10px]">Live Drivers <span className="tnum text-txt2 font-700">{composite.contributors}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {drivers.map((d, i) => (
          <motion.div key={d.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card d={d} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
