import { motion } from 'framer-motion';
import { CAPITAL_FLOWS } from '../data/intel';
import { biasColor } from '../components/ui';
import { PageHeader } from './PageShell';

/** Market Mood — risk gauge + the capital-flow readings that drive it. */
export function MarketMoodPage() {
  const avg = Math.round(CAPITAL_FLOWS.reduce((a, x) => a + x.value, 0) / CAPITAL_FLOWS.length);
  const bands = ['Extreme Risk-Off', 'Risk-Off', 'Neutral', 'Risk-On', 'Extreme Risk-On'];
  const idx = avg >= 75 ? 0 : avg >= 60 ? 1 : avg >= 45 ? 2 : avg >= 30 ? 3 : 4;
  const angle = -90 + (1 - avg / 100) * 180;

  return (
    <div>
      <PageHeader
        title="Market Mood"
        description="A composite risk gauge for gold, built from the prevailing capital-flow signals. Risk-off conditions typically favour bullion."
      />
      <div className="rule my-8" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-16 gap-y-10 items-center">
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative" style={{ width: 280, height: 160 }}>
            <svg width="280" height="160" viewBox="0 0 280 160">
              <defs>
                <linearGradient id="moodp" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#FF4D6D" /><stop offset="0.5" stopColor="#FFC857" /><stop offset="1" stopColor="#00D98B" />
                </linearGradient>
              </defs>
              <path d="M24 144 A116 116 0 0 1 256 144" fill="none" stroke="url(#moodp)" strokeWidth="14" strokeLinecap="round" />
              <motion.line x1="140" y1="144" x2="140" y2="44" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"
                initial={{ rotate: -90 }} animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: 50 }}
                style={{ transformOrigin: '140px 144px' }} />
              <circle cx="140" cy="144" r="6" fill="#D4AF37" />
            </svg>
          </div>
          <div className="text-center mt-3">
            <div className="font-sora font-800 text-[26px] text-gold">{bands[idx]}</div>
            <div className="text-[12px] text-muted mt-1">Composite {avg}/100 · gold-positive bias</div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="eyebrow mb-5">Capital Flow Signals</div>
          <div className="space-y-5">
            {CAPITAL_FLOWS.map((f) => {
              const c = biasColor(f.bias);
              return (
                <div key={f.key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[14px] text-txt2">{f.label}</span>
                    <span className="text-[12px] tnum" style={{ color: c }}>{f.bias}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${c}44, ${c})` }}
                      initial={{ width: 0 }} whileInView={{ width: `${f.value}%` }} viewport={{ once: true }} transition={{ duration: 0.9 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
