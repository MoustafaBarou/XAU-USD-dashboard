import { useEffect, useState } from 'react';
import {
  fetchAllInstruments, PRICE_POLL_MS, type Quote, type InstrumentMap,
} from '../services/priceService';

export interface MacroState {
  /** full instrument map (DXY, US10Y, US02Y, SPX, NASDAQ, VIX). */
  instruments: InstrumentMap | null;
  /** kept for backward compatibility with existing callers. */
  dxy: Quote | null;
  us10y: Quote | null;
  loading: boolean;
  lastUpdated: number | null;
}

/**
 * Polls the full instrument set from FMP every 60s. Each instrument is either
 * available (real value + change% + change$) or available:false -> the UI shows
 * DATA UNAVAILABLE / no feed. Nothing is fabricated.
 */
export function useMacroData(): MacroState {
  const [state, setState] = useState<MacroState>({
    instruments: null, dxy: null, us10y: null, loading: true, lastUpdated: null,
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      const instruments = await fetchAllInstruments();
      if (alive) {
        setState({
          instruments,
          dxy: instruments.DXY,
          us10y: instruments.US10Y,
          loading: false,
          lastUpdated: Date.now(),
        });
      }
    }
    load();
    const id = setInterval(load, PRICE_POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return state;
}
