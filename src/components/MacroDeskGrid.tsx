import { motion } from 'framer-motion';
import { MACRO_CARDS, type Bias } from '../data/intel';
import type { GoldState } from '../hooks/useGoldFeed';
import { Eyebrow } from './ui';

function biasColor(b: Bias) {
  if (b === 'Strong Bullish' || b === 'Bullish') return '#4ADE80';
  if (b === 'Strong Bearish' || b === 'Bearish') return '#FF4D6D';
  return '#FFC857';
}

/** One HybridTrader-style card. */
function Card({
  symbol, changePct, live, bias, confidence, analysis, status,
}: {
  symbol: string; changePct: number | null; live: boolean;
  bias: Bias; confidence: number; analysis: string; status?: string;
}) {
  const bc = biasColor(bias);
  const chgColor = changePct === null ? '#8A93A6' : changePct >= 0 ? '#4ADE80' : '#FF4D6D';
  return (
    <div className="card card-hover p-4 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-sora font-800 text-[16px] text-txt tracking-wide">{symbol}</span>
          {live && <span className="h-1.5 w-1.5 rounded-full bg-greenBright animate-pulse" style={{ boxShadow: '0 0 6px #4ADE80' }} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] tnum font-600" style={{ color: chgColor }}>
            {changePct === null ? 'no feed' : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`}
          </span>
          <span className="text-[10px] font-700 px-2 py-[2px] rounded-full uppercase tracking-wide"
            style={{ color: bc, background: `${bc}1a`, border: `1px solid ${bc}40` }}>{bias}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted">{status ?? 'Confidence'}</span>
        <span className="text-[11px] tnum text-txt2">{confidence}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-3">
        <div className="h-full rounded-full" style={{ width: `${confidence}%`, background: 'linear-gradient(90deg,#15803D,#4ADE80)' }} />
      </div>

      <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-greenBright text-[11px]">✦</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-greenSoft font-700">AI Analysis</span>
        </div>
        <p className="text-[12px] leading-relaxed text-txt2/85">{analysis}</p>
      </div>
    </div>
  );
}

export function MacroDeskGrid({ g }: { g: GoldState }) {
  const xauChange = g.price !== null && g.dayOpen ? ((g.price - g.dayOpen) / g.dayOpen) * 100 : null;
  const xauBias: Bias = xauChange === null ? 'Neutral' : xauChange > 0.05 ? 'Bullish' : xauChange < -0.05 ? 'Bearish' : 'Neutral';

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-greenBright">↗</span>
            <h3 className="font-sora font-700 text-[16px] text-txt">AI Macro Desk</h3>
          </div>
          <div className="text-[11px] text-muted mt-0.5">Gold bias analysis</div>
        </div>
        <Eyebrow>XAU/USD focus</Eyebrow>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* live XAU/USD card first */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            symbol="XAUUSD"
            changePct={xauChange}
            live={g.status === 'connected' && g.price !== null}
            bias={xauBias}
            confidence={g.tickCount > 0 ? Math.min(95, 60 + g.tickCount) : 60}
            status={g.price !== null ? `Spot ${g.price.toFixed(2)}` : 'Awaiting feed'}
            analysis={
              g.status === 'connected' && g.price !== null
                ? `Live spot ${g.price.toFixed(2)}, ${xauChange! >= 0 ? 'up' : 'down'} ${Math.abs(xauChange!).toFixed(2)}% on the session. ${xauBias === 'Bullish' ? 'Buyers in control of the intraday tape.' : xauBias === 'Bearish' ? 'Sellers pressing the session lower.' : 'Two-way and balanced.'}`
                : 'Live price feed offline — no price-derived read. No data is fabricated.'
            }
          />
        </motion.div>

        {/* gold-driver cards (editorial) */}
        {MACRO_CARDS.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.05 }}>
            <Card
              symbol={c.title.replace(/\s*\(.*\)/, '').toUpperCase().slice(0, 14)}
              changePct={null}
              live={false}
              bias={c.bias}
              confidence={c.confidence}
              status={c.status}
              analysis={c.analysis}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
