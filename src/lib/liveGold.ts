// liveGold.ts - derives a complete live XAU/USD market snapshot from the real
// tick feed (useGoldFeed) plus, when a Twelve Data key is present, a genuine
// daily reference (open / high / low / previous close) from Twelve Data's REST
// quote endpoint. No mock data, no random generation: every number traces back
// to a real source. When only the keyless gold-api spot feed is available, the
// daily change is computed against the first real price observed this session
// and is labelled accordingly by the UI.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGoldFeed, type GoldState } from '../hooks/useGoldFeed';

const TWELVEDATA_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY as string | undefined;

export interface DailyRef {
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  fromQuote: boolean;
}

export interface LiveGold {
  status: GoldState['status'];
  provider: string;
  isLive: boolean;
  marketOpen: boolean;

  price: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  direction: 'up' | 'down' | 'flat';

  changeAbs: number | null;
  changePct: number | null;
  changeBasis: 'daily' | 'session';

  high: number | null;
  low: number | null;

  lastTickTime: number | null;
  history: { t: number; p: number }[];
}

/**
 * XAU/USD spot trades ~23h/day, Sun 22:00 UTC -> Fri 21:00 UTC (closed weekend).
 */
export function isGoldMarketOpen(d = new Date()): boolean {
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  if (day === 6) return false;
  if (day === 0) return hour >= 22;
  if (day === 5) return hour < 21;
  return true;
}

async function fetchDailyQuote(signal: AbortSignal): Promise<DailyRef | null> {
  if (!TWELVEDATA_KEY) return null;
  const url = `https://api.twelvedata.com/quote?symbol=XAU/USD&apikey=${encodeURIComponent(TWELVEDATA_KEY)}`;
  const res = await fetch(url, { cache: 'no-store', signal });
  if (!res.ok) return null;
  const d = await res.json();
  if (!d || d.status === 'error') return null;
  const num = (v: unknown) => {
    const n = Number(v);
    return isFinite(n) && n > 0 ? n : null;
  };
  return {
    open: num(d.open),
    high: num(d.high),
    low: num(d.low),
    previousClose: num(d.previous_close),
    fromQuote: true,
  };
}

export function useLiveGold(): LiveGold {
  const feed = useGoldFeed();
  const [quote, setQuote] = useState<DailyRef | null>(null);
  const [marketOpen, setMarketOpen] = useState<boolean>(isGoldMarketOpen());
  const quoteFetchedFor = useRef<string>('');

  useEffect(() => {
    const id = setInterval(() => setMarketOpen(isGoldMarketOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!TWELVEDATA_KEY) return;
    let alive = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        const q = await fetchDailyQuote(controller.signal);
        if (alive && q) {
          setQuote(q);
          quoteFetchedFor.current = new Date().toISOString().slice(0, 10);
        }
      } catch { /* network hiccup: keep last good quote, never fabricate */ }
    };

    load();
    const id = setInterval(load, 5 * 60_000);
    return () => { alive = false; controller.abort(); clearInterval(id); };
  }, []);

  const provider = TWELVEDATA_KEY ? 'Twelve Data' : 'gold-api.com';
  const isLive = feed.status === 'connected' && feed.price !== null && marketOpen;

  const derived = useMemo(() => {
    const price = feed.price;

    let basis: 'daily' | 'session' = 'session';
    let ref: number | null = feed.dayOpen;
    if (quote) {
      if (quote.previousClose !== null) { ref = quote.previousClose; basis = 'daily'; }
      else if (quote.open !== null) { ref = quote.open; basis = 'daily'; }
    }

    let changeAbs: number | null = null;
    let changePct: number | null = null;
    if (price !== null && ref !== null && ref > 0) {
      changeAbs = +(price - ref).toFixed(2);
      changePct = +(((price - ref) / ref) * 100).toFixed(2);
    }

    let high = quote?.high ?? null;
    let low = quote?.low ?? null;
    if (feed.high !== null) high = high === null ? feed.high : Math.max(high, feed.high);
    if (feed.low !== null) low = low === null ? feed.low : Math.min(low, feed.low);
    if (price !== null) {
      high = high === null ? price : Math.max(high, price);
      low = low === null ? price : Math.min(low, price);
    }

    return { changeAbs, changePct, basis, high, low };
  }, [feed.price, feed.dayOpen, feed.high, feed.low, quote]);

  return {
    status: feed.status,
    provider,
    isLive,
    marketOpen,
    price: feed.price,
    bid: feed.bid,
    ask: feed.ask,
    spread: feed.spread,
    direction: feed.direction,
    changeAbs: derived.changeAbs,
    changePct: derived.changePct,
    changeBasis: derived.basis,
    high: derived.high,
    low: derived.low,
    lastTickTime: feed.lastTickTime,
    history: feed.history,
  };
}
