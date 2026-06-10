// ── Authored macro-intelligence content ──────────────────────────────────
// These are qualitative analyst views, written as editable static content.
// They are NOT random-generated and NOT fabricated price data. Treat them as
// the terminal's editorial layer — update them as your macro view changes, or
// wire them to a real research source later.

export type Bias = 'Bullish' | 'Bearish' | 'Neutral' | 'Strong Bullish' | 'Strong Bearish';

export interface MacroCard {
  key: string;
  title: string;
  status: string;
  confidence: number;
  bias: Bias;
  analysis: string;
}

export const MACRO_CARDS: MacroCard[] = [
  { key: 'dxy', title: 'Dollar Index (DXY)', status: 'Softening', confidence: 72, bias: 'Bullish',
    analysis: 'Dollar momentum has cooled as rate-cut expectations firm up. A weaker USD lowers the opportunity cost of holding gold and is supportive at the margin.' },
  { key: 'us10y', title: 'US 10Y Yield', status: 'Range-bound', confidence: 64, bias: 'Neutral',
    analysis: 'Nominal yields are consolidating. Gold is tolerant of stable nominals; the swing factor is the real-yield path rather than the nominal headline.' },
  { key: 'real', title: 'Real Yields', status: 'Moderating', confidence: 70, bias: 'Bullish',
    analysis: 'Easing real yields reduce the carry penalty on non-yielding assets. Continued moderation is historically one of the cleanest tailwinds for bullion.' },
  { key: 'infl', title: 'Inflation', status: 'Sticky core', confidence: 58, bias: 'Neutral',
    analysis: 'Headline disinflation continues while core remains firm. Mixed signal for gold: supports the store-of-value case but keeps policy uncertainty elevated.' },
  { key: 'cb', title: 'Central Bank Buying', status: 'Robust', confidence: 81, bias: 'Strong Bullish',
    analysis: 'Official-sector accumulation remains a structural, price-insensitive bid. This is the slowest-moving but highest-conviction pillar of the bull case.' },
  { key: 'etf', title: 'Gold ETF Flows', status: 'Stabilising', confidence: 61, bias: 'Bullish',
    analysis: 'Western ETF outflows have slowed and are tentatively turning. A flip to sustained inflows would mark the return of the tactical investor.' },
  { key: 'geo', title: 'Geopolitical Risk', status: 'Elevated', confidence: 67, bias: 'Bullish',
    analysis: 'Persistent geopolitical tension sustains a safe-haven premium. This driver is episodic and can compress quickly if tensions de-escalate.' },
];

export const AI_OVERVIEW = {
  regime: 'Late-cycle easing bias',
  riskEnv: 'Cautiously risk-on',
  goldOutlook: 'Constructive',
  positioning: 'Moderately long, room to add',
  summary:
    'Gold remains supported by moderating real yields and continued central bank demand. Dollar strength has softened while geopolitical uncertainty remains elevated. Current conditions favour bullish continuation unless real yields accelerate materially higher.',
};

export const FOR_YOU = {
  mood: 'Constructive',
  keyDriver: 'Moderating real yields',
  whatChanged: 'Rate-cut pricing firmed after softer growth data; the dollar gave back recent gains.',
  whyItMatters: 'Lower real yields cut the cost of holding a non-yielding asset, the most reliable mechanical tailwind for gold.',
  impactOnGold: 'Supportive. Dips toward prior support are more likely to be bought than sold while this backdrop holds.',
  tradingImplications: 'Favour buying weakness over chasing strength. Invalidation is a decisive, sustained jump in real yields or a sharp risk-on rotation out of havens.',
};

// Edge Factor component weights (sum = 1). Scores are authored 0-100 readings.
export const EDGE_INPUTS = [
  { key: 'DXY', score: 68, weight: 0.18 },
  { key: 'US10Y', score: 55, weight: 0.16 },
  { key: 'Inflation', score: 52, weight: 0.12 },
  { key: 'Volatility', score: 60, weight: 0.12 },
  { key: 'ETF Flows', score: 58, weight: 0.14 },
  { key: 'News Impact', score: 64, weight: 0.12 },
  { key: 'Central Bank Demand', score: 82, weight: 0.16 },
];

export const CAPITAL_FLOWS = [
  { key: 'DXY', label: 'Dollar Index', value: 38, bias: 'Bullish' as Bias },     // low DXY pressure = bullish gold
  { key: 'US10Y', label: 'US 10Y Yield', value: 50, bias: 'Neutral' as Bias },
  { key: 'ETF', label: 'Gold ETF Flows', value: 58, bias: 'Bullish' as Bias },
  { key: 'INF', label: 'Inflation Expectations', value: 54, bias: 'Neutral' as Bias },
  { key: 'CB', label: 'Central Bank Buying', value: 82, bias: 'Strong Bullish' as Bias },
  { key: 'GEO', label: 'Geopolitical Risk', value: 67, bias: 'Bullish' as Bias },
];

export interface NewsItem {
  source: string; time: string; headline: string; summary: string; impact: Bias;
}
export const NEWS: NewsItem[] = [
  { source: 'Macro Desk', time: '08:42', headline: 'Real yields ease as growth data softens',
    summary: 'A cooler activity print pulled real yields lower, reinforcing the carry case for bullion.', impact: 'Bullish' },
  { source: 'Macro Desk', time: '07:15', headline: 'Dollar gives back weekly gains',
    summary: 'DXY retraced as rate-cut odds firmed, easing pressure on dollar-priced gold.', impact: 'Bullish' },
  { source: 'Macro Desk', time: '06:30', headline: 'Official-sector demand stays firm',
    summary: 'Reserve diversification continues to provide a structural, price-insensitive bid.', impact: 'Strong Bullish' },
  { source: 'Macro Desk', time: 'Yesterday', headline: 'Core inflation holds firmer than expected',
    summary: 'Sticky core keeps policy uncertainty alive; mixed read for the near-term path.', impact: 'Neutral' },
];
