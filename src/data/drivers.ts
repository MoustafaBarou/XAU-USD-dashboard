// ── Gold Driver Matrix — live-injection-ready data model ──────────────────
//
// The matrix renders ENTIRELY from this array. Nothing is hardcoded in the
// component, so a live feed can replace `value`, `delta`, `direction`, etc.
// at runtime and the UI updates with no structural change.
//
// `value`/`delta` are null until a real feed supplies them. The matrix shows
// "—" for nulls and never fabricates a number. `impact`, `strength` and
// `confidence` are analyst-set editorial readings until a macro feed is wired.

export type Direction = 'Rising' | 'Falling' | 'Flat' | 'Unknown';
export type Impact = 'Bullish' | 'Bearish' | 'Neutral';

export interface DriverRow {
  key: string;
  name: string;
  unit?: string;            // e.g. '', 'bps', '%' — for display of value/delta
  value: number | null;     // current live value (null = no feed)
  delta: number | null;     // change vs prior reference (null = no feed)
  direction: Direction;     // movement of the driver itself
  impact: Impact;           // resulting pressure on gold
  strength: number;         // 0-100 how forceful right now
  confidence: number;       // 0-100 conviction in the read
  note: string;
  /** true once a live feed is populating value/delta for this row */
  live?: boolean;
}

/**
 * Default editorial seed. A feed adapter can deep-merge live values onto these
 * rows by `key` (see applyDriverFeed below) without touching the structure.
 */
export const DRIVER_SEED: DriverRow[] = [
  { key: 'dxy',   name: 'Dollar Index (DXY)', unit: '',    value: null, delta: null, direction: 'Falling', impact: 'Bullish', strength: 68, confidence: 72, note: 'Softer USD lowers the cost of holding gold.' },
  { key: 'us10y', name: 'US 10Y Yield',       unit: '%',   value: null, delta: null, direction: 'Flat',    impact: 'Neutral', strength: 45, confidence: 64, note: 'Nominal yields consolidating; real-yield path is the swing factor.' },
  { key: 'real',  name: 'Real Yields (10Y)',  unit: '%',   value: null, delta: null, direction: 'Falling', impact: 'Bullish', strength: 70, confidence: 70, note: 'Easing real yields cut the carry penalty on bullion.' },
  { key: 'infl',  name: 'Inflation (CPI YoY)',unit: '%',   value: null, delta: null, direction: 'Falling', impact: 'Neutral', strength: 40, confidence: 58, note: 'Headline cooling, core sticky — mixed signal.' },
  { key: 'cb',    name: 'Central Bank Buying',unit: 't',   value: null, delta: null, direction: 'Rising',  impact: 'Bullish', strength: 82, confidence: 81, note: 'Structural, price-insensitive official-sector bid.' },
  { key: 'etf',   name: 'Gold ETF Flows',     unit: 't',   value: null, delta: null, direction: 'Rising',  impact: 'Bullish', strength: 55, confidence: 61, note: 'Western outflows slowing, tentatively turning.' },
  { key: 'geo',   name: 'Geopolitical Risk',  unit: 'idx', value: null, delta: null, direction: 'Rising',  impact: 'Bullish', strength: 64, confidence: 67, note: 'Persistent tension sustains a safe-haven premium.' },
];

/** Backwards-compat alias for older imports. */
export const DRIVERS = DRIVER_SEED;

/**
 * Merge a partial live update (keyed by driver key) onto the seed.
 * A future macro feed calls this; the matrix re-renders from the result.
 */
export function applyDriverFeed(
  base: DriverRow[],
  updates: Record<string, Partial<DriverRow>>
): DriverRow[] {
  return base.map((row) =>
    updates[row.key] ? { ...row, ...updates[row.key], live: true } : row
  );
}
