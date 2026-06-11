import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchEconomicCalendar, CALENDAR_POLL_MS, type CalendarResult, type EconEvent, type Impact } from '../services/calendarService';
import { Eyebrow } from './ui';

function impactColor(i: Impact) {
  return i === 'High' ? '#FF4D6D' : i === 'Medium' ? '#FFC857' : i === 'Low' ? '#4ADE80' : '#8A93A6';
}
function fmtVal(v: number | null, unit: string) {
  return v === null ? '—' : `${v}${unit || ''}`;
}
function dayLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function LiveCalendar() {
  const [result, setResult] = useState<CalendarResult | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(initial = false) {
    if (initial) setLoading(true);
    const r = await fetchEconomicCalendar();
    setResult(r);
    setLoading(false);
  }

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), CALENDAR_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-greenBright">🗓</span>
          <h3 className="font-sora font-700 text-[15px] text-txt tracking-wide">Upcoming Gold-Relevant Events</h3>
        </div>
        <div className="flex items-center gap-3">
          {result?.ok && <span className="flex items-center gap-1.5 text-[11px] text-greenSoft"><span className="h-1.5 w-1.5 rounded-full bg-greenBright animate-pulse" style={{ boxShadow: '0 0 7px #4ADE80' }} />FMP · live</span>}
          <Eyebrow>Next 7 days</Eyebrow>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 animate-pulse"><div className="h-4 w-1/2 bg-white/10 rounded mb-2" /><div className="h-3 w-1/3 bg-white/8 rounded" /></div>
          ))}
        </div>
      )}

      {!loading && result && !result.ok && (
        <div className="card p-6">
          <div className="font-sora font-700 text-[15px] mb-2" style={{ color: result.reason === 'no-key' ? '#FFC857' : '#FF4D6D' }}>
            {result.reason === 'no-key' ? 'Calendar not yet connected' : 'DATA UNAVAILABLE'}
          </div>
          <p className="text-[13px] text-txt2/85 leading-relaxed">{result.message}</p>
          {result.reason === 'no-key' && (
            <p className="text-[12px] text-muted leading-relaxed mt-3">Get a free key at <span className="text-greenSoft">financialmodelingprep.com</span>, add <code className="text-greenSoft">VITE_FMP_API_KEY</code> and rebuild.</p>
          )}
          {result.reason === 'error' && (
            <button onClick={() => load(true)} className="mt-4 card card-hover px-4 py-2 text-[12px] font-600 text-txt2 transition-colors">Retry now</button>
          )}
        </div>
      )}

      {!loading && result?.ok && (
        <div className="space-y-2">
          {/* header row */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 pb-2 text-[10px] uppercase tracking-[0.14em] text-muted/70 border-b border-white/[0.05]">
            <span className="col-span-3">When</span>
            <span className="col-span-4">Event</span>
            <span className="col-span-1">Impact</span>
            <span className="col-span-1 text-right">Actual</span>
            <span className="col-span-1 text-right">Est.</span>
            <span className="col-span-2 text-right">Previous</span>
          </div>
          {result.events.map((e: EconEvent, i) => {
            const ic = impactColor(e.impact);
            return (
              <motion.div key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.25) }}
                className={`grid grid-cols-2 md:grid-cols-12 gap-x-3 gap-y-1.5 items-center card p-4 ${e.goldRelevant ? 'border-l-2' : ''}`}
                style={e.goldRelevant ? { borderLeftColor: '#D4AF37' } : undefined}>
                <div className="md:col-span-3">
                  <div className="text-[13px] text-txt font-600">{dayLabel(e.date)}</div>
                  <div className="text-[11px] text-muted tnum">{timeLabel(e.date)} · {e.country}</div>
                </div>
                <div className="md:col-span-4 text-[13px] text-txt2">{e.event}</div>
                <div className="md:col-span-1">
                  <span className="text-[9px] font-700 px-2 py-[2px] rounded-full uppercase" style={{ color: ic, background: `${ic}1a`, border: `1px solid ${ic}40` }}>{e.impact}</span>
                </div>
                <div className="md:col-span-1 text-right text-[12px] tnum" style={{ color: e.actual !== null ? '#fff' : '#5A6273' }}>{fmtVal(e.actual, e.unit)}</div>
                <div className="md:col-span-1 text-right text-[12px] tnum text-muted">{fmtVal(e.estimate, e.unit)}</div>
                <div className="md:col-span-2 text-right text-[12px] tnum text-muted">{fmtVal(e.previous, e.unit)}</div>
              </motion.div>
            );
          })}
          <div className="text-[10px] text-muted/60 mt-3 text-center">Live from Financial Modeling Prep · gold-relevant events highlighted · auto-refreshing every 5 min.</div>
        </div>
      )}
    </div>
  );
}
