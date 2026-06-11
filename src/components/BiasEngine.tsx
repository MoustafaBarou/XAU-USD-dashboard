import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { computeBias, type BiasResult, type BiasLevel } from '../data/bias';
import { DRIVER_SEED } from '../data/drivers';
import type { GoldState } from '../hooks/useGoldFeed';
import type { Quote } from '../services/priceService';
import { Eyebrow } from './ui';

const LEVELS: BiasLevel[] = ['Strong Bearish', 'Bearish', 'Neutral', 'Bullish', 'Strong Bullish'];
function levelColor(l: BiasLevel) {
  if (l === 'Strong Bullish' || l === 'Bullish') return '#4ADE80';
  if (l === 'Strong Bearish' || l === 'Bearish') return '#FF4D6D';
  return '#FFC857';
}
function impColor(i: string) { return i === 'Bullish' ? '#4ADE80' : i === 'Bearish' ? '#FF4D6D' : '#FFC857'; }

export function BiasEngine({ g, dxy, us10y }: { g: GoldState; dxy?: Quote | null; us10y?: Quote | null }) {
  const [bias, setBias] = useState<BiasResult>(() => computeBias({ drivers: DRIVER_SEED, g, dxy, us10y }));
  useEffect(() => {
    setBias(computeBias({ drivers: DRIVER_SEED, g, dxy, us10y }));
  }, [g.price, g.status, g.tickCount, g.high, g.low, dxy?.value, dxy?.changePct, us10y?.value, us10y?.changePct]);

  const c = levelColor(bias.level);
  const markerPct = ((bias.score + 100) / 200) * 100;

  return (
    <section className="py-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">Gold Bias Engine</h3>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: bias.live ? '#4ADE80' : '#FF4D6D', boxShadow: bias.live ? '0 0 8px #4ADE80' : 'none' }} />
          <Eyebrow>{bias.live ? `Live · ${bias.liveInputs.join(' · ')}` : 'No live data'}</Eyebrow>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-center">
        <div className="lg:col-span-4">
          <motion.div key={bias.level} initial={{ opacity: 0.5, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="font-sora font-800 leading-none" style={{ color: c, fontSize: 'clamp(30px,3.4vw,44px)' }}>
            {bias.level}
          </motion.div>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Confidence</span>
            <div className="h-1 w-28 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#15803D,#4ADE80)' }}
                initial={{ width: 0 }} animate={{ width: `${bias.confidence}%` }} transition={{ duration: 0.7 }} />
            </div>
            <span className="text-[12px] tnum text-txt2">{bias.confidence}%</span>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="relative">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'linear-gradient(90deg,#FF4D6D,#FFC857 50%,#4ADE80)' }} />
            <motion.div className="absolute" initial={{ left: '50%' }} animate={{ left: `${markerPct}%` }}
              transition={{ type: 'spring', stiffness: 60 }}
              style={{ top: '50%', transform: 'translate(-50%,-50%)', height: 20, width: 20, borderRadius: '9999px', background: '#fff', border: `2px solid ${c}`, boxShadow: `0 0 12px ${c}` }} />
          </div>
          <div className="flex justify-between mt-3">
            {LEVELS.map((l) => (
              <span key={l} className="text-[10px] tracking-wide"
                style={{ color: l === bias.level ? levelColor(l) : '#5A6273', fontWeight: l === bias.level ? 700 : 400 }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* live signals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {bias.signals.map((s) => {
          const col = s.live ? impColor(s.impact) : '#8A93A6';
          return (
            <div key={s.name} className="card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{s.name}</span>
                {s.live
                  ? <span className="text-[9px] font-700 px-2 py-[2px] rounded-full uppercase" style={{ color: col, background: `${col}1a`, border: `1px solid ${col}40` }}>{s.impact}</span>
                  : <span className="text-[9px] font-700 px-2 py-[2px] rounded-full uppercase text-muted" style={{ background: 'rgba(138,147,166,0.1)', border: '1px solid rgba(138,147,166,0.3)' }}>N/A</span>}
              </div>
              <div className="font-sora font-700 text-[15px] tnum" style={{ color: s.live ? '#fff' : '#FF4D6D' }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 mt-8">
        <div className="lg:col-span-7">
          <div className="text-[10px] uppercase tracking-[0.18em] text-greenSoft/80 mb-2">Reasoning</div>
          <motion.p key={bias.reasoning} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-[15px] leading-relaxed text-txt2">{bias.reasoning}</motion.p>
        </div>
        <div className="lg:col-span-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-greenSoft/80 mb-2">Structural Drivers</div>
          <div className="space-y-2.5">
            {bias.topDrivers.map((d) => {
              const dc = d.impact === 'Bullish' ? '#4ADE80' : d.impact === 'Bearish' ? '#FF4D6D' : '#FFC857';
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="h-6 w-1 rounded-full" style={{ background: dc }} />
                  <span className="text-[13px] text-txt flex-1">{d.name}</span>
                  <span className="text-[11px] tnum" style={{ color: dc }}>{d.impact}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
