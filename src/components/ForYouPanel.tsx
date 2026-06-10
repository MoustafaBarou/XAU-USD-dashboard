import { motion } from 'framer-motion';
import { FOR_YOU, CAPITAL_FLOWS, type Bias } from '../data/intel';

function biasColor(b: Bias) {
  if (b === 'Strong Bullish' || b === 'Bullish') return '#4ADE80';
  if (b === 'Strong Bearish' || b === 'Bearish') return '#FF4D6D';
  return '#FFC857';
}

/** "For You" pre-session briefing + Capital Flow, HybridTrader-style. */
export function ForYouPanel() {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-greenBright">▦</span>
          <div>
            <h3 className="font-sora font-700 text-[16px] text-txt">For You</h3>
            <div className="text-[11px] text-muted mt-0.5">Your pre-session market briefing</div>
          </div>
        </div>
        <span className="card px-2.5 py-1 text-[10px] text-muted tracking-wide">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
      </div>

      <h4 className="font-sora font-700 text-[18px] text-txt leading-snug mb-3">
        Gold supported by moderating real yields and steady official-sector demand
      </h4>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] text-muted">Market Mood</span>
        <span className="text-[10px] font-700 px-2.5 py-[3px] rounded-full uppercase tracking-wide"
          style={{ color: '#FFC857', background: '#FFC8571a', border: '1px solid #FFC85740' }}>{FOR_YOU.mood}</span>
        <span className="text-[10px] font-700 px-2.5 py-[3px] rounded-full uppercase tracking-wide"
          style={{ color: '#4ADE80', background: '#4ADE801a', border: '1px solid #4ADE8040' }}>Supportive</span>
      </div>

      <p className="text-[13px] leading-relaxed text-txt2/90 mb-2">
        {FOR_YOU.whatChanged} {FOR_YOU.whyItMatters}
      </p>
      <p className="text-[13px] leading-relaxed text-txt2/90 mb-4">
        {FOR_YOU.impactOnGold} {FOR_YOU.tradingImplications}
      </p>

      {/* Capital Flow */}
      <div className="card p-4 mt-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-greenBright text-[12px]">⇄</span>
            <span className="font-sora font-700 text-[13px] text-txt">Capital Flow</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />
            Editorial · no live feed
          </span>
        </div>
        <div className="space-y-2.5">
          {CAPITAL_FLOWS.map((f) => {
            const c = biasColor(f.bias);
            return (
              <div key={f.key} className="flex items-center gap-3">
                <span className="font-sora font-700 text-[11px] text-txt2 w-16 uppercase tracking-wide">{f.key}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${c}55, ${c})` }}
                    initial={{ width: 0 }} whileInView={{ width: `${f.value}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
                </div>
                <span className="text-[11px] tnum w-12 text-right" style={{ color: c }}>{f.bias === 'Bearish' || f.bias === 'Strong Bearish' ? '−' : '+'}{(f.value / 40).toFixed(2)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
