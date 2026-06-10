import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { computeBias, type BiasResult, type BiasLevel } from '../data/bias';
import { DRIVER_SEED } from '../data/drivers';
import type { GoldState } from '../hooks/useGoldFeed';
import { Eyebrow } from './ui';

const LEVELS: BiasLevel[] = ['Strong Bearish', 'Bearish', 'Neutral', 'Bullish', 'Strong Bullish'];
function levelColor(l: BiasLevel) {
  if (l === 'Strong Bullish' || l === 'Bullish') return '#00D98B';
  if (l === 'Strong Bearish' || l === 'Bearish') return '#FF4D6D';
  return '#FFC857';
}

/** Gold Bias Engine — recomputes automatically when price or drivers change. */
export function BiasEngine({ g }: { g: GoldState }) {
  const [bias, setBias] = useState<BiasResult>(() => computeBias(DRIVER_SEED, g));
  useEffect(() => { setBias(computeBias(DRIVER_SEED, g)); }, [g.price, g.status, g.tickCount, g.high, g.low]);

  const c = levelColor(bias.level);
  const activeIdx = LEVELS.indexOf(bias.level);
  // map score -100..100 to 0..100 for the position marker
  const markerPct = ((bias.score + 100) / 200) * 100;

  return (
    <section className="py-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">Gold Bias Engine</h3>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: bias.live ? '#00D98B' : '#FF4D6D', boxShadow: bias.live ? '0 0 8px #00D98B' : 'none' }} />
          <Eyebrow>{bias.live ? 'Auto-updating' : 'Awaiting live feed'}</Eyebrow>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-center">
        {/* verdict */}
        <div className="lg:col-span-4">
          <motion.div key={bias.level} initial={{ opacity: 0.5, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="font-sora font-800 leading-none" style={{ color: c, fontSize: 'clamp(30px,3.4vw,44px)' }}>
            {bias.level}
          </motion.div>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Confidence</span>
            <div className="h-1 w-28 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#A77A00,#FFD700)' }}
                initial={{ width: 0 }} animate={{ width: `${bias.confidence}%` }} transition={{ duration: 0.7 }} />
            </div>
            <span className="text-[12px] tnum text-txt2">{bias.confidence}%</span>
          </div>
        </div>

        {/* scale */}
        <div className="lg:col-span-8">
          <div className="relative">
            <div className="h-2 rounded-full overflow-hidden"
              style={{ background: 'linear-gradient(90deg,#FF4D6D,#FFC857 50%,#00D98B)' }} />
            <motion.div
              className="absolute"
              initial={{ left: '50%' }}
              animate={{ left: `${markerPct}%` }}
              transition={{ type: 'spring', stiffness: 60 }}
              style={{
                top: '50%', transform: 'translate(-50%,-50%)',
                height: 20, width: 20, borderRadius: '9999px',
                background: '#fff', border: `2px solid ${c}`, boxShadow: `0 0 12px ${c}`,
              }}
            />
          </div>
          <div className="flex justify-between mt-3">
            {LEVELS.map((l, i) => (
              <span key={l} className="text-[10px] tracking-wide"
                style={{ color: i === activeIdx ? levelColor(l) : '#5A6273', fontWeight: i === activeIdx ? 700 : 400 }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* reasoning + top drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 mt-8">
        <div className="lg:col-span-7">
          <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 mb-2">Reasoning</div>
          <motion.p key={bias.reasoning} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
            className="text-[15px] leading-relaxed text-txt2">{bias.reasoning}</motion.p>
        </div>
        <div className="lg:col-span-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80 mb-2">Top Drivers</div>
          <div className="space-y-2.5">
            {bias.topDrivers.map((d) => {
              const dc = d.impact === 'Bullish' ? '#00D98B' : d.impact === 'Bearish' ? '#FF4D6D' : '#FFC857';
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
