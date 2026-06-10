import { useEffect, useRef, useState } from 'react';
import { createFeed, type FeedStatus, type Tick } from '../feed';

export interface GoldState {
  status: FeedStatus;
  detail?: string;
  price: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  lastTickTime: number | null;
  tickCount: number;
  direction: 'up' | 'down' | 'flat';
  dayOpen: number | null;       // first real price seen this session
  weekRef: number | null;       // first real price (proxy for weekly ref until history feed)
  high: number | null;
  low: number | null;
  atr: number | null;           // rolling range proxy from observed ticks
  history: { t: number; p: number }[];
}

const MAX_HISTORY = 240;

export function useGoldFeed() {
  const [state, setState] = useState<GoldState>({
    status: 'connecting', price: null, bid: null, ask: null, spread: null,
    lastTickTime: null, tickCount: 0, direction: 'flat',
    dayOpen: null, weekRef: null, high: null, low: null, atr: null, history: [],
  });
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const feed = createFeed('gold-api');
    const offStatus = feed.onStatus((status, detail) =>
      setState((s) => ({ ...s, status, detail }))
    );
    const offTick = feed.onTick((tick: Tick) => {
      setState((s) => {
        const dir: 'up' | 'down' | 'flat' =
          prev.current === null ? 'flat' : tick.price > prev.current ? 'up' : tick.price < prev.current ? 'down' : 'flat';
        prev.current = tick.price;
        const history = [...s.history, { t: tick.time, p: tick.price }].slice(-MAX_HISTORY);
        const high = s.high === null ? tick.price : Math.max(s.high, tick.price);
        const low = s.low === null ? tick.price : Math.min(s.low, tick.price);
        // ATR proxy: average absolute move over recent ticks
        const moves = history.slice(1).map((h, i) => Math.abs(h.p - history[i].p));
        const atr = moves.length ? +(moves.reduce((a, b) => a + b, 0) / moves.length * 14).toFixed(2) : null;
        return {
          ...s,
          status: 'connected',
          price: tick.price, bid: tick.bid, ask: tick.ask,
          spread: +(tick.ask - tick.bid).toFixed(2),
          lastTickTime: tick.time,
          tickCount: s.tickCount + 1,
          direction: dir,
          dayOpen: s.dayOpen ?? tick.price,
          weekRef: s.weekRef ?? tick.price,
          high, low, atr, history,
        };
      });
    });
    feed.connect();
    feed.subscribe('XAU/USD');
    return () => { offStatus(); offTick(); feed.disconnect(); };
  }, []);

  return state;
}
