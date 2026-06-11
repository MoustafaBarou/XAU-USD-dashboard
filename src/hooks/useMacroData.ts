import { useEffect, useState } from 'react';
import { fetchMacroQuotes, PRICE_POLL_MS, type Quote } from '../services/priceService';

export interface MacroState {
  dxy: Quote | null;
  us10y: Quote | null;
  loading: boolean;
}

/** Polls DXY + US10Y from FMP every 60s. Null + available:false => DATA UNAVAILABLE. */
export function useMacroData(): MacroState {
  const [state, setState] = useState<MacroState>({ dxy: null, us10y: null, loading: true });

  useEffect(() => {
    let alive = true;
    async function load() {
      const { dxy, us10y } = await fetchMacroQuotes();
      if (alive) setState({ dxy, us10y, loading: false });
    }
    load();
    const id = setInterval(load, PRICE_POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return state;
}
