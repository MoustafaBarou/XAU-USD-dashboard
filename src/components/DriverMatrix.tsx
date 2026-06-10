import { motion } from 'framer-motion';
import { DRIVER_SEED, type Direction, type Impact } from '../data/drivers';
import { Eyebrow } from './ui';

function impactColor(i: Impact) { return i === 'Bullish' ? '#00D98B' : i === 'Bearish' ? '#FF4D6D' : '#FFC857'; }
function dirGlyph(d: Direction) { return d === 'Rising' ? '▲' : d === 'Falling' ? '▼' : d === 'Flat' ? '▬' : '·'; }
function dirColor(d: Direction) { return d === 'Rising' ? '#00D98B' : d === 'Falling' ? '#FF4D6D' : '#8A93A6'; }
function fmt(v: number | null, unit?: string) {
  if (v === null) return '—';
  const s = v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return unit ? `${s}${unit === '%' ? '%' : ' ' + unit}` : s;
}

/**
 * Gold Driver Matrix — renders entirely from DRIVER_SEED (live-injection ready).
 * Columns: Driver · Value · Direction · Delta · Gold Impact · Strength · Confidence.
 * Presented as an open analyst ledger, not a boxed widget.
 */
export function DriverMatrix() {
  const rows = DRIVER_SEED;
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">Gold Driver Matrix</h3>
        <Eyebrow>Always-on signal board</Eyebrow>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 pb-4 text-[10px] uppercase tracking-[0.16em] text-muted/70 border-b border-white/[0.05]">
        <span className="col-span-3">Driver</span>
        <span className="col-span-2">Value</span>
        <span className="col-span-1">Dir</span>
        <span className="col-span-1">Δ</span>
        <span className="col-span-2">Gold Impact</span>
        <span className="col-span-2">Strength</span>
        <span className="col-span-1 text-right">Conf</span>
      </div>

      <div>
        {rows.map((d, i) => {
          const ic = impactColor(d.impact);
          return (
            <motion.div key={d.key} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              className="grid grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-2 items-center py-5 border-b border-white/[0.035]">
              <div className="col-span-2 md:col-span-3">
                <div className="font-sora font-700 text-[15px] text-txt">{d.name}</div>
                <div className="text-[11px] text-muted mt-1 leading-snug">{d.note}</div>
              </div>
              <div className="md:col-span-2 font-sora font-700 text-[15px] tnum" style={{ color: d.live ? '#fff' : '#4A5260' }}>
                {fmt(d.value, d.unit)}
                {!d.live && <span className="block text-[9px] uppercase tracking-[0.14em] text-muted/40 font-400">no feed</span>}
              </div>
              <div className="md:col-span-1 flex items-center gap-1.5">
                <span style={{ color: dirColor(d.direction) }} className="text-[12px]">{dirGlyph(d.direction)}</span>
                <span className="text-[12px] text-txt2 md:hidden lg:inline">{d.direction}</span>
              </div>
              <div className="md:col-span-1 text-[13px] tnum" style={{ color: d.delta === null ? '#4A5260' : d.delta >= 0 ? '#00D98B' : '#FF4D6D' }}>
                {d.delta === null ? '—' : `${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(2)}`}
              </div>
              <div className="md:col-span-2">
                <span className="text-[10px] font-700 px-2.5 py-[3px] rounded-full uppercase tracking-wide"
                  style={{ color: ic, background: `${ic}14`, border: `1px solid ${ic}33` }}>{d.impact}</span>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${ic}55, ${ic})` }}
                    initial={{ width: 0 }} whileInView={{ width: `${d.strength}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
                </div>
                <span className="text-[11px] tnum text-txt2 w-6 text-right">{d.strength}</span>
              </div>
              <div className="md:col-span-1 flex items-center justify-end gap-1.5">
                <span className="text-[11px] tnum text-muted">{d.confidence}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="text-[10px] text-muted/55 mt-4">
        Renders from a single data model — value & delta populate live when a macro feed is connected; impact, strength and confidence are analyst readings until then.
      </div>
    </section>
  );
}
