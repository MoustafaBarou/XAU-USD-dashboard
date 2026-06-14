import { motion } from 'framer-motion';
import { MACRO_CARDS } from '../data/intel';
import { BiasPill, Confidence, biasColor } from '../components/ui';
import { PageHeader } from './PageShell';

/** Macro Desk — full analyst write-up per gold driver (editorial readings). */
export function MacroDeskPage() {
  return (
    <div>
      <PageHeader
        title="Macro Desk"
        description="Structural drivers · state · gold bias · analyst read"
      />
      <div className="rule my-8" />
      <div>
        {MACRO_CARDS.map((c, i) => {
          const col = biasColor(c.bias);
          return (
            <motion.div key={c.key} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-3 items-start py-6 border-b border-white/[0.04]">
              <div className="md:col-span-3 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full" style={{ background: col, boxShadow: `0 0 12px ${col}66` }} />
                <div>
                  <div className="font-sora font-700 text-[16px] text-txt">{c.title}</div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-goldSoft mt-0.5">{c.status}</div>
                </div>
              </div>
              <p className="md:col-span-6 text-[14px] leading-relaxed text-txt2/85">{c.analysis}</p>
              <div className="md:col-span-3 flex md:flex-col md:items-end gap-2">
                <BiasPill bias={c.bias} />
                <Confidence value={c.confidence} />
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted/55 mt-6">
        Analyst readings · map onto a live macro feed when connected
      </div>
    </div>
  );
}
