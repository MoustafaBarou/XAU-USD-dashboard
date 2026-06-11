// -- Gold Impact Engine ----------------------------------------------------
// Transparent, rule-based mapping of an economic event's actual-vs-forecast
// surprise to a directional bias on gold (XAU/USD). No external calls, no
// randomness: same input always yields the same output.

export type GoldBias = 'Bullish Gold' | 'Bearish Gold' | 'Neutral';

export interface GoldImpact {
  bias: GoldBias;
  reason: string;
  /** 0-100 strength of the signal (higher = clearer surprise / bigger mover) */
  strength: number;
}

// How "actual > forecast" maps to gold for a given event family.
// 'beatBearish' = a beat is bearish for gold (strong-USD data).
// 'beatBullish' = a beat is bullish for gold.
type Direction = 'beatBearish' | 'beatBullish';

interface Rule {
  re: RegExp;
  dir: Direction;
  weight: number; // base strength for this event family
  label: string;
}

// Order matters: more specific patterns first.
const RULES: Rule[] = [
  // Inflation: a hot CPI/PCE print tends to be gold-supportive (inflation hedge
  // + real-yield path), per the brief (CPI beat -> Bullish Gold).
  { re: /\b(core\s+)?cpi\b|consumer price/i, dir: 'beatBullish', weight: 85, label: 'CPI' },
  { re: /\bpce\b|personal consumption/i, dir: 'beatBullish', weight: 78, label: 'PCE' },

  // Producer prices: a beat is treated as bearish for gold per the brief.
  { re: /\bppi\b|producer price/i, dir: 'beatBearish', weight: 72, label: 'PPI' },

  // Jobs / growth: strong data lifts USD -> bearish gold.
  { re: /non[-\s]?farm|nfp|payroll/i, dir: 'beatBearish', weight: 90, label: 'NFP' },
  { re: /retail sales/i, dir: 'beatBearish', weight: 75, label: 'Retail Sales' },
  { re: /\bgdp\b|gross domestic/i, dir: 'beatBearish', weight: 80, label: 'GDP' },

  // Jobless / unemployment claims: a beat (more claims) is weak labour ->
  // dovish -> bullish gold.
  { re: /jobless|unemployment claims|initial claims/i, dir: 'beatBullish', weight: 68, label: 'Jobless Claims' },

  // Unemployment rate: a higher rate (beat) is weak labour -> bullish gold.
  { re: /unemployment rate/i, dir: 'beatBullish', weight: 70, label: 'Unemployment Rate' },

  // Rate decisions / hawkish-dovish handled by name only (no actual/forecast
  // numeric surprise needed); left Neutral unless numbers present.
  { re: /interest rate|rate decision|fomc|fed funds/i, dir: 'beatBearish', weight: 88, label: 'Rate Decision' },
];

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const cleaned = String(v).replace(/[%,\s]/g, '').replace(/[KkMmBb]$/, '');
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

export interface ImpactInput {
  event: string;
  actual?: number | string | null;
  estimate?: number | string | null; // forecast
  previous?: number | string | null;
}

/**
 * Compute the gold bias for one economic event.
 * Returns Neutral when there is no matching rule or no actual-vs-forecast
 * surprise to read.
 */
export function computeGoldImpact(input: ImpactInput): GoldImpact {
  const rule = RULES.find((r) => r.re.test(input.event));
  if (!rule) {
    return { bias: 'Neutral', reason: 'No mapped gold driver for this event.', strength: 30 };
  }

  const actual = toNum(input.actual);
  const forecast = toNum(input.estimate);
  const previous = toNum(input.previous);

  if (actual === null) {
    return {
      bias: 'Neutral',
      reason: `${rule.label}: awaiting the release. Watch actual vs forecast.`,
      strength: 35,
    };
  }

  const ref = forecast !== null ? forecast : previous;
  if (ref === null) {
    return { bias: 'Neutral', reason: `${rule.label}: no forecast or prior to compare.`, strength: 35 };
  }

  const beat = actual > ref;
  const miss = actual < ref;
  if (!beat && !miss) {
    return { bias: 'Neutral', reason: `${rule.label}: in line with expectations.`, strength: 40 };
  }

  let bias: GoldBias;
  if (rule.dir === 'beatBearish') {
    bias = beat ? 'Bearish Gold' : 'Bullish Gold';
  } else {
    bias = beat ? 'Bullish Gold' : 'Bearish Gold';
  }

  const surprise = ref !== 0 ? Math.abs(actual - ref) / Math.abs(ref) : Math.abs(actual - ref);
  const scaled = Math.min(100, Math.round(rule.weight * (0.6 + Math.min(1, surprise) * 0.6)));

  const dirWord = bias === 'Bullish Gold' ? 'supports' : 'pressures';
  const beatWord = beat ? 'above' : 'below';
  const reason = `${rule.label} came in ${beatWord} expectations (${actual} vs ${ref}) - ${dirWord} gold.`;

  return { bias, reason, strength: scaled };
}

export function biasMarker(bias: GoldBias): string {
  return bias === 'Bullish Gold' ? '🟢' : bias === 'Bearish Gold' ? '🔴' : '⚪';
}

export function biasSign(bias: GoldBias): number {
  return bias === 'Bullish Gold' ? 1 : bias === 'Bearish Gold' ? -1 : 0;
}
