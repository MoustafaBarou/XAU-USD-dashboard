import { useEffect, useState, useMemo, useCallback } from 'react';
import { computeGoldImpact, biasMarker } from '../lib/goldImpact';
import { EventCountdown } from './EventCountdown';

// -- Types -----------------------------------------------------------------
type Impact = 'High' | 'Medium' | 'Low' | 'None';
type DayTab = 'today' | 'tomorrow' | 'week';

interface EconEvent {
  id: string;
  date: string;          // ISO (UTC)
  currency: string;
  country: string;
  event: string;
  impact: Impact;
  actual: number | string | null;
  estimate: number | string | null;
  previous: number | string | null;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; events: EconEvent[] };

const FMP_KEY = import.meta.env.VITE_FMP_API_KEY as string | undefined;
const CALENDAR_PROXY = '/api/calendar';

const CURRENCIES = ['All', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'] as const;
const IMPACTS: Impact[] = ['High', 'Medium', 'Low'];

const impactColor: Record<Impact, string> = {
  High: '#FF4D6D',
  Medium: '#FFC857',
  Low: '#FFE66D',
  None: '#8A93A6',
};

const fmtDay = (d: Date) => d.toISOString().slice(0, 10);

function normalizeImpact(v: unknown): Impact {
  const s = String(v ?? '').toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'medium' || s === 'moderate') return 'Medium';
  if (s === 'low') return 'Low';
  return 'None';
}
function val(v: unknown): number | string | null {
  if (v === null || v === undefined || v === '') return null;
  return typeof v === 'number' ? v : String(v);
}

function parseJbDate(s: unknown): string {
  const str = String(s ?? '');
  const iso = str.replace(/^(\d{4})\.(\d{2})\.(\d{2})\s+(.+)$/, '$1-$2-$3T$4Z');
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

async function fetchJBlanked(fromISO: string, toISO: string): Promise<EconEvent[]> {
  const url = `${CALENDAR_PROXY}?from=${fromISO}&to=${toISO}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Calendar HTTP ${res.status}`);
  const arr = await res.json();
  if (!Array.isArray(arr)) throw new Error('Calendar: unexpected response');
  return arr.map((e: Record<string, unknown>, i: number) => ({
    id: `${e.Name ?? 'evt'}-${e.Date ?? i}-${i}`,
    date: parseJbDate(e.Date),
    currency: String(e.Currency ?? '-'),
    country: String(e.Currency ?? '-'),
    event: String(e.Name ?? 'Unknown event'),
    impact: normalizeImpact(e.Impact),
    actual: val(e.Actual),
    estimate: val(e.Forecast),
    previous: val(e.Previous),
  }));
}

async function fetchFmp(fromISO: string, toISO: string): Promise<EconEvent[]> {
  const endpoints = [
    `https://financialmodelingprep.com/stable/economic-calendar?from=${fromISO}&to=${toISO}&apikey=${FMP_KEY}`,
    `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromISO}&to=${toISO}&apikey=${FMP_KEY}`,
  ];
  let lastErr = '';
  for (const url of endpoints) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      lastErr = res.status === 403
        ? 'FMP 403 - your plan does not include the economic calendar.'
        : `FMP HTTP ${res.status}`;
      continue;
    }
    const arr = await res.json();
    if (!Array.isArray(arr)) { lastErr = 'FMP: unexpected response'; continue; }
    return arr.map((e: Record<string, unknown>, i: number) => ({
      id: `${e.event ?? 'evt'}-${e.date ?? i}-${i}`,
      date: String(e.date ?? ''),
      currency: String(e.currency ?? e.country ?? '-'),
      country: String(e.country ?? e.currency ?? '-'),
      event: String(e.event ?? 'Unknown event'),
      impact: normalizeImpact(e.impact),
      actual: val(e.actual),
      estimate: val(e.estimate),
      previous: val(e.previous),
    }));
  }
  throw new Error(lastErr || 'FMP fetch failed');
}

async function fetchCalendar(fromISO: string, toISO: string): Promise<EconEvent[]> {
  const errors: string[] = [];
  try { return await fetchJBlanked(fromISO, toISO); }
  catch (e) { errors.push(e instanceof Error ? e.message : 'Calendar proxy failed'); }
  if (FMP_KEY) {
    try { return await fetchFmp(fromISO, toISO); }
    catch (e) { errors.push(e instanceof Error ? e.message : 'FMP failed'); }
  }
  throw new Error(errors.join(' - ') || 'No data source available');
}

export function EconomicCalendar() {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [tab, setTab] = useState<DayTab>('today');
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('All');
  const [impacts, setImpacts] = useState<Set<Impact>>(new Set(IMPACTS));

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const from = new Date();
      const to = new Date(); to.setDate(to.getDate() + 7);
      const events = await fetchCalendar(fmtDay(from), fmtDay(to));
      setState({ status: 'ok', events });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'fetch failed' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleImpact = (im: Impact) => {
    setImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(im)) next.delete(im); else next.add(im);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (state.status !== 'ok') return [];
    const now = new Date();
    const todayStr = fmtDay(now);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmtDay(tomorrow);

    return state.events
      .filter((e) => {
        if (!e.date) return false;
        const day = e.date.slice(0, 10);
        if (tab === 'today') return day === todayStr;
        if (tab === 'tomorrow') return day === tomorrowStr;
        return true;
      })
      .filter((e) => currency === 'All' || e.currency === currency)
      .filter((e) => impacts.has(e.impact) || e.impact === 'None')
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [state, tab, currency, impacts]);

  return (
    <div className="space-y-5">
      {/* -- Day tabs -- */}
      <div className="flex gap-1 surface p-1 rounded-xl w-full md:w-auto md:inline-flex">
        {([['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'This Week']] as [DayTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-[13px] font-sora font-700 tracking-wide transition-all ${
              tab === key ? 'text-bg bg-gradient-to-r from-goldBright to-gold' : 'text-txt2 hover:text-txt'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* -- Filters -- */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        <div className="flex flex-wrap gap-1.5">
          {CURRENCIES.map((c) => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-600 border transition-all ${
                currency === c ? 'border-gold/50 text-gold bg-gold/[0.08]' : 'border-white/10 text-txt2 hover:text-txt hover:border-white/20'
              }`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 md:ml-auto">
          {IMPACTS.map((im) => {
            const on = impacts.has(im);
            return (
              <button key={im} onClick={() => toggleImpact(im)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-600 border transition-all flex items-center gap-1.5"
                style={on
                  ? { borderColor: `${impactColor[im]}66`, color: impactColor[im], background: `${impactColor[im]}14` }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: '#8A93A6' }}>
                <span className="h-2 w-2 rounded-full" style={{ background: on ? impactColor[im] : '#3A3F4B' }} />
                {im}
              </button>
            );
          })}
        </div>
      </div>

      {/* -- Body -- */}
      <div className="surface surface-lit p-0 overflow-hidden">
        {state.status === 'loading' && <div className="p-8 text-[13px] text-muted text-center">Loading economic calendar...</div>}
        {state.status === 'error' && (
          <div className="p-8 text-[13px] text-bear text-center">
            Couldn't load the calendar ({state.message}).
            <button onClick={load} className="ml-2 text-greenSoft hover:underline">Retry</button>
          </div>
        )}
        {state.status === 'ok' && filtered.length === 0 && (
          <div className="p-8 text-[13px] text-muted/70 text-center">No events match these filters for the selected period.</div>
        )}
        {state.status === 'ok' && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <div className="hidden md:grid grid-cols-[80px_70px_80px_1fr_90px_90px_90px_120px] gap-3 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted/70 border-b border-white/[0.06]">
              <span>Time</span><span>Currency</span><span>Impact</span><span>Event</span>
              <span className="text-right">Previous</span><span className="text-right">Forecast</span><span className="text-right">Actual</span>
              <span>Gold</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {filtered.map((e) => {
                const t = e.date ? new Date(e.date) : null;
                const time = t ? t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '-';
                const gi = computeGoldImpact({ event: e.event, actual: e.actual, estimate: e.estimate, previous: e.previous });
                const giColor = gi.bias === 'Bullish Gold' ? '#00D98B' : gi.bias === 'Bearish Gold' ? '#FF4D6D' : '#8A93A6';
                const upcoming = !!t && t.getTime() > Date.now();
                const showCountdown = upcoming && e.impact === 'High';
                return (
                  <div key={e.id}
                    className="grid grid-cols-2 md:grid-cols-[80px_70px_80px_1fr_90px_90px_90px_120px] gap-x-3 gap-y-1.5 px-4 md:px-5 py-3 text-[13px] hover:bg-white/[0.02] transition-colors">
                    <span className="tnum text-txt2 md:text-txt">{time}<span className="text-muted/50 text-[10px] ml-1">UTC</span></span>
                    <span className="font-700 text-txt">{e.currency}</span>
                    <span className="flex items-center">
                      <span className="text-[10px] font-700 px-2 py-[2px] rounded-full uppercase tracking-wide"
                        style={{ color: impactColor[e.impact], background: `${impactColor[e.impact]}1a`, border: `1px solid ${impactColor[e.impact]}40` }}>
                        {e.impact}
                      </span>
                    </span>
                    <span className="col-span-2 md:col-span-1 text-txt2 md:text-txt order-last md:order-none">
                      {e.event}
                      {showCountdown && (
                        <span className="ml-2 text-[11px] text-gold">⏳ <EventCountdown target={e.date} /></span>
                      )}
                    </span>
                    <span className="tnum text-muted md:text-right"><span className="md:hidden text-[10px] uppercase mr-1">Prev</span>{e.previous ?? '-'}</span>
                    <span className="tnum text-txt2 md:text-right"><span className="md:hidden text-[10px] uppercase mr-1">Fcst</span>{e.estimate ?? '-'}</span>
                    <span className="tnum md:text-right font-700" style={{ color: e.actual !== null ? '#FFFFFF' : '#8A93A6' }}>
                      <span className="md:hidden text-[10px] uppercase mr-1 font-400">Act</span>{e.actual ?? '-'}
                    </span>
                    <span className="flex items-center gap-1.5" title={gi.reason}>
                      <span>{biasMarker(gi.bias)}</span>
                      <span className="text-[11px] font-600" style={{ color: giColor }}>
                        {gi.bias === 'Bullish Gold' ? 'Bullish' : gi.bias === 'Bearish Gold' ? 'Bearish' : 'Neutral'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-muted/55">
        Live data from JBlanked (Forex Factory) - times shown in UTC.
      </div>
    </div>
  );
}
