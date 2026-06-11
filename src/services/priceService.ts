// ── Live price service (DXY, US10Y) ───────────────────────────────────────
// Real quotes from Financial Modeling Prep (FMP). Free tier, CORS-enabled,
// callable directly from the browser — works on GitHub Pages with no backend.
//
//   DXY  -> symbol ^DXY   (US Dollar Index)
//   US10Y-> symbol ^TNX   (CBOE 10Y Treasury Yield index; value = yield% * 1)
//
// No mock data. If no key is set or the request fails, the value is null and
// the UI shows "DATA UNAVAILABLE".

export interface Quote {
  symbol: string;
  label: string;
  value: number | null;
  changePct: number | null;
  unit: string;          // '', '%'
  available: boolean;
  error?: string;
}

const FMP_KEY = import.meta.env.VITE_FMP_API_KEY as string | undefined;
const BASE = 'https://financialmodelingprep.com/api/v3';

function unavailable(symbol: string, label: string, unit: string, error: string): Quote {
  return { symbol, label, value: null, changePct: null, unit, available: false, error };
}

async function fmpQuote(symbol: string): Promise<{ price: number; changesPercentage: number } | null> {
  const url = `${BASE}/quote/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
  const arr = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const q = arr[0];
  if (typeof q.price !== 'number') return null;
  return { price: q.price, changesPercentage: typeof q.changesPercentage === 'number' ? q.changesPercentage : 0 };
}

export async function fetchDxy(): Promise<Quote> {
  if (!FMP_KEY) return unavailable('^DXY', 'Dollar Index (DXY)', '', 'No FMP API key');
  try {
    const q = await fmpQuote('^DXY');
    if (!q) return unavailable('^DXY', 'Dollar Index (DXY)', '', 'No data returned');
    return { symbol: '^DXY', label: 'Dollar Index (DXY)', value: +q.price.toFixed(2), changePct: +q.changesPercentage.toFixed(2), unit: '', available: true };
  } catch (e) {
    return unavailable('^DXY', 'Dollar Index (DXY)', '', e instanceof Error ? e.message : 'fetch failed');
  }
}

export async function fetchUs10y(): Promise<Quote> {
  if (!FMP_KEY) return unavailable('^TNX', 'US 10Y Yield', '%', 'No FMP API key');
  try {
    const q = await fmpQuote('^TNX');
    if (!q) return unavailable('^TNX', 'US 10Y Yield', '%', 'No data returned');
    // ^TNX is quoted as yield already (e.g. 4.22). Some feeds give *10; normalise if huge.
    const yld = q.price > 25 ? q.price / 10 : q.price;
    return { symbol: '^TNX', label: 'US 10Y Yield', value: +yld.toFixed(2), changePct: +q.changesPercentage.toFixed(2), unit: '%', available: true };
  } catch (e) {
    return unavailable('^TNX', 'US 10Y Yield', '%', e instanceof Error ? e.message : 'fetch failed');
  }
}

export async function fetchMacroQuotes(): Promise<{ dxy: Quote; us10y: Quote }> {
  const [dxy, us10y] = await Promise.all([fetchDxy(), fetchUs10y()]);
  return { dxy, us10y };
}

export const PRICE_POLL_MS = 60_000;
export const HAS_FMP_KEY = !!FMP_KEY;
