// -- Live price service (FMP) ----------------------------------------------
// Real quotes from Financial Modeling Prep. Browser-direct, CORS-enabled.
// Covers the full AURUM instrument tape:
//   XAUUSD handled by the realtime gold feed (separate). Here we provide the
//   macro/index instruments: DXY, US10Y, US02Y, SPX, NASDAQ, VIX.
//
// FMP quote payload gives us: price, change (absolute $), changesPercentage,
// dayLow, dayHigh, open, previousClose, timestamp. We surface all of it.
//
// HONEST DATA POLICY: no mock values. If the key is missing, or FMP returns no
// data / a premium-gated error for a symbol, that instrument is marked
// available:false and the UI shows "DATA UNAVAILABLE" or "no feed". Never fabricated.

export interface Quote {
  symbol: string;
  label: string;
  value: number | null;
  changePct: number | null;
  changeAbs: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  open: number | null;
  asOf: number | null;        // ms epoch of the quote timestamp
  unit: string;               // '', '%'
  available: boolean;
  error?: string;
}

export type InstrumentKey = 'DXY' | 'US10Y' | 'US02Y' | 'SPX' | 'NASDAQ' | 'VIX';

interface InstrumentDef {
  key: InstrumentKey;
  fmpSymbol: string;
  label: string;
  unit: string;
  /** treat raw price as a yield that may arrive scaled x10 (e.g. ^TNX = 42.2 -> 4.22). */
  yieldScaled?: boolean;
}

const FMP_KEY = import.meta.env.VITE_FMP_API_KEY as string | undefined;
const STABLE = 'https://financialmodelingprep.com/stable';
const V3 = 'https://financialmodelingprep.com/api/v3';

export const HAS_FMP_KEY = !!FMP_KEY;
export const PRICE_POLL_MS = 60_000;

const INSTRUMENTS: InstrumentDef[] = [
  { key: 'DXY',    fmpSymbol: '^DXY',  label: 'Dollar Index (DXY)', unit: '' },
  { key: 'US10Y',  fmpSymbol: '^TNX',  label: 'US 10Y Yield',       unit: '%', yieldScaled: true },
  { key: 'US02Y',  fmpSymbol: '^FVX',  label: 'US 5Y Yield',        unit: '%', yieldScaled: true },
  { key: 'SPX',    fmpSymbol: '^GSPC', label: 'S&P 500',            unit: '' },
  { key: 'NASDAQ', fmpSymbol: '^IXIC', label: 'Nasdaq Composite',   unit: '' },
  { key: 'VIX',    fmpSymbol: '^VIX',  label: 'CBOE Volatility',    unit: '' },
];
// NOTE on US02Y: FMP's free index set does not reliably expose a 2Y yield symbol.
// ^FVX (5Y) and ^TNX (10Y) are the dependable CBOE yield indices. We keep US02Y
// in the type for the tape, but it resolves to available:false unless a real 2Y
// symbol is configured - we never fake it. (Override via VITE_FMP_US02Y_SYMBOL
// if your plan exposes one.)
const US02Y_SYMBOL = (import.meta.env.VITE_FMP_US02Y_SYMBOL as string | undefined) ?? '';

function unavailable(def: { fmpSymbol: string; label: string; unit: string }, error: string): Quote {
  return {
    symbol: def.fmpSymbol, label: def.label, value: null, changePct: null, changeAbs: null,
    dayHigh: null, dayLow: null, open: null, asOf: null, unit: def.unit, available: false, error,
  };
}

interface FmpRaw {
  symbol?: string;
  price?: number;
  change?: number;
  changesPercentage?: number;
  dayLow?: number;
  dayHigh?: number;
  open?: number;
  previousClose?: number;
  timestamp?: number;
}

async function fmpQuoteRaw(symbol: string): Promise<FmpRaw | null> {
  const urls = [
    `${STABLE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`,
    `${V3}/quote/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`,
  ];
  let lastErr = '';
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        lastErr = res.status === 403 ? 'premium-gated (403)' : `HTTP ${res.status}`;
        continue;
      }
      const data = await res.json();
      const row: FmpRaw | undefined = Array.isArray(data) ? data[0] : data;
      if (row && typeof row.price === 'number') return row;
      lastErr = 'no data';
    } catch (e) {
      lastErr = e instanceof Error ? e.message : 'fetch failed';
    }
  }
  throw new Error(lastErr || 'fetch failed');
}

function toQuote(def: InstrumentDef, raw: FmpRaw): Quote {
  let value = raw.price as number;
  if (def.yieldScaled && value > 25) value = value / 10;
  const changeAbs = typeof raw.change === 'number'
    ? (def.yieldScaled && Math.abs(raw.change) > 2.5 ? raw.change / 10 : raw.change)
    : null;
  return {
    symbol: def.fmpSymbol,
    label: def.label,
    value: +value.toFixed(2),
    changePct: typeof raw.changesPercentage === 'number' ? +raw.changesPercentage.toFixed(2) : null,
    changeAbs: changeAbs === null ? null : +changeAbs.toFixed(2),
    dayHigh: typeof raw.dayHigh === 'number' ? raw.dayHigh : null,
    dayLow: typeof raw.dayLow === 'number' ? raw.dayLow : null,
    open: typeof raw.open === 'number' ? raw.open : null,
    asOf: typeof raw.timestamp === 'number' ? raw.timestamp * 1000 : Date.now(),
    unit: def.unit,
    available: true,
  };
}

async function fetchOne(def: InstrumentDef): Promise<Quote> {
  if (!FMP_KEY) return unavailable(def, 'No FMP API key');
  if (def.key === 'US02Y' && !US02Y_SYMBOL) {
    return unavailable({ fmpSymbol: '^US2Y', label: 'US 2Y Yield', unit: '%' }, 'No 2Y symbol on this plan');
  }
  const symbol = def.key === 'US02Y' && US02Y_SYMBOL ? US02Y_SYMBOL : def.fmpSymbol;
  try {
    const raw = await fmpQuoteRaw(symbol);
    if (!raw) return unavailable(def, 'No data returned');
    return toQuote(def, raw);
  } catch (e) {
    return unavailable(def, e instanceof Error ? e.message : 'fetch failed');
  }
}

export type InstrumentMap = Record<InstrumentKey, Quote>;

export async function fetchAllInstruments(): Promise<InstrumentMap> {
  const results = await Promise.all(INSTRUMENTS.map(fetchOne));
  const map = {} as InstrumentMap;
  INSTRUMENTS.forEach((def, i) => { map[def.key] = results[i]; });
  return map;
}

// -- Backward-compatible helpers (existing callers keep working) -----------

export async function fetchDxy(): Promise<Quote> {
  return fetchOne(INSTRUMENTS[0]);
}
export async function fetchUs10y(): Promise<Quote> {
  return fetchOne(INSTRUMENTS[1]);
}
export async function fetchMacroQuotes(): Promise<{ dxy: Quote; us10y: Quote }> {
  const [dxy, us10y] = await Promise.all([fetchDxy(), fetchUs10y()]);
  return { dxy, us10y };
}
