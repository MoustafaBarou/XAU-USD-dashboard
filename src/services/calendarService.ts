// ── Economic calendar service ─────────────────────────────────────────────
// Real economic events from Financial Modeling Prep's economic calendar.
// (Forex Factory has no public CORS API, so FMP is the browser-callable
//  equivalent.) Free tier, CORS-enabled. No mock data — if no key or no data,
// the UI shows "DATA UNAVAILABLE".

export type Impact = 'High' | 'Medium' | 'Low' | 'None';

export interface EconEvent {
  id: string;
  date: string;          // ISO
  country: string;
  event: string;
  impact: Impact;
  actual: number | null;
  estimate: number | null;
  previous: number | null;
  unit: string;
  goldRelevant: boolean;
}

export type CalendarResult =
  | { ok: true; events: EconEvent[] }
  | { ok: false; reason: 'no-key' | 'error' | 'empty'; message: string };

const FMP_KEY = import.meta.env.VITE_FMP_API_KEY as string | undefined;
const BASE = 'https://financialmodelingprep.com/api/v3';

// Events that move gold the most
const GOLD_RE = /\b(cpi|inflation|pce|nonfarm|non-farm|payroll|nfp|unemployment|fomc|fed|interest rate|rate decision|gdp|retail sales|ppi|jobless|treasury|powell)\b/i;

function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }

export async function fetchEconomicCalendar(): Promise<CalendarResult> {
  if (!FMP_KEY) {
    return { ok: false, reason: 'no-key', message: 'No calendar data feed key configured. Add the API key to enable the live economic calendar.' };
  }
  try {
    const from = new Date();
    const to = new Date(); to.setDate(to.getDate() + 7);
    const url = `${BASE}/economic_calendar?from=${fmtDate(from)}&to=${fmtDate(to)}&apikey=${FMP_KEY}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Calendar feed HTTP ${res.status}`);
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('Unexpected response');

    const events: EconEvent[] = arr
      .filter((e: any) => (e.country === 'US' || e.currency === 'USD' || GOLD_RE.test(e.event ?? '')))
      .map((e: any, i: number) => {
        const impact = (['High', 'Medium', 'Low'].includes(e.impact) ? e.impact : 'None') as Impact;
        return {
          id: `${e.event}-${e.date}-${i}`,
          date: e.date ?? new Date().toISOString(),
          country: e.country ?? e.currency ?? '—',
          event: e.event ?? 'Unknown event',
          impact,
          actual: e.actual ?? null,
          estimate: e.estimate ?? null,
          previous: e.previous ?? null,
          unit: e.unit ?? '',
          goldRelevant: GOLD_RE.test(e.event ?? ''),
        };
      })
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));

    if (events.length === 0) return { ok: false, reason: 'empty', message: 'No US/gold-relevant events in the next 7 days.' };
    return { ok: true, events };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'fetch failed' };
  }
}

export const CALENDAR_POLL_MS = 300_000; // 5 min — calendar changes slowly
