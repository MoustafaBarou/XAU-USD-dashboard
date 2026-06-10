import { motion } from 'framer-motion';
import { NEWS } from '../data/intel';
import { Eyebrow, BiasPill } from './ui';

export function NewsTerminal() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">News Intelligence</h3>
        <Eyebrow>Feed</Eyebrow>
      </div>
      <div>
        {NEWS.map((n, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.05 }} className="py-5 border-b border-white/[0.04] first:pt-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-gold/80">{n.source}</span>
              <span className="text-[10px] tnum text-muted">{n.time}</span>
            </div>
            <div className="font-sora font-600 text-[15px] text-txt mb-2">{n.headline}</div>
            <p className="text-[13px] text-txt2/85 mb-3 leading-relaxed">{n.summary}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted">Gold impact</span>
              <BiasPill bias={n.impact} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
