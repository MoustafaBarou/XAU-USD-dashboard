import { useEffect, useState, useCallback } from 'react';
import { parseJbDateAms } from '../lib/time';

export type Impact = 'High' | 'Medium' | 'Low' | 'None';

export interface CalEvent {
  id: string;
  date: string;          // ISO (UTC)
  currency: string;
  event: string;
  impact: Impact;
  actual: number | string | null;
  estimate: number | string | null;
  previous: number | string | null;
}

export type CalState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; events: CalEvent[] };

const PROXY = '/api/calendar';
const POLL_MS = 5 * 60 * 1000;

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
const parseJbDate = parseJbDateAms;

// JBlanked sometimes returns the same release twice (e.g. a real-time entry
// and a delayed/duplicate entry an hour apart). Collapse same event+currency on
// the same day into one row: prefer the entry that already has an actual value,
// otherwise the earliest time (which matches ForexFactory's listing).
export function dedupeEvents<T extends { event: string; currency: string; date: string; actual: number | string | null }>(events: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const e of events) {
    if (!e.date) continue;
    const day = e.date.slice(0, 10);
    const key = `${e.currency}|${e.event}|${day}`;
    const existing = byKey.get(key);
    if (!existing) { byKey.set(key, e); continue; }
    const eHasActual = e.actual !== null;
    const exHasActual = existing.actual !== null;
    if (eHasActual && !exHasActual) { byKey.set(key, e); continue; }
    if (!eHasActual && exHasActual) { continue; }
    if (+new Date(e.date) < +new Date(existing.date)) { byKey.set(key, e); }
  }
  return [...byKey.values()].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

async function fetchEvents(): Promise<CalEvent[]> {
  const from = new Date();
  const to = new Date(); to.setDate(to.getDate() + 7);
  const res = await fetch(`${PROXY}?from=${fmtDay(from)}&to=${fmtDay(to)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Calendar HTTP ${res.status}`);
  const arr = await res.json();
  if (!Array.isArray(arr)) throw new Error('Calendar: unexpected response');
  const mapped = arr.map((e: Record<string, unknown>, i: number) => {
    const date = parseJbDate(e.Date);
    // JBlanked returns 0 (not null) for the actual of events that have not been
    // released yet. Any event still in the future cannot have an actual, so we
    // treat it as pending (null) regardless of the placeholder value.
    const isFuture = date !== '' && new Date(date).getTime() > Date.now();
    const rawActual = val(e.Actual);
    return {
      id: `${e.Name ?? 'evt'}-${e.Date ?? i}-${i}`,
      date,
      currency: String(e.Currency ?? '-'),
      event: String(e.Name ?? 'Unknown event'),
      impact: normalizeImpact(e.Impact),
      actual: isFuture ? null : rawActual,
      estimate: val(e.Forecast),
      previous: val(e.Previous),
    };
  });
  return dedupeEvents(mapped);
}

/** Shared hook: fetches the 7-day calendar via the proxy and refreshes it. */
export function useEconomicCalendar(): CalState & { reload: () => void } {
  const [state, setState] = useState<CalState>({ status: 'loading' });

  const load = useCallback(async () => {
    try {
      const events = await fetchEvents();
      setState({ status: 'ok', events });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'fetch failed' });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    load();
    const id = setInterval(() => { if (alive) load(); }, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [load]);

  return { ...state, reload: load };
}

export function nextHighImpact(events: CalEvent[], now = Date.now()): CalEvent | null {
  return events
    .filter((e) => e.impact === 'High' && e.date && +new Date(e.date) > now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0] ?? null;
}
