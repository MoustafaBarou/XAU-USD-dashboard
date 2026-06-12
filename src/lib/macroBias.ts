// macroBias.ts - reproducible, mechanical gold-bias engine.
//
// Every bias here is DETERMINISTIC: the same inputs always produce the same
// output. No AI text generation, no random values, no hardcoded sentiment.
// Each driver documents its formula. Drivers without a live data source are
// returned as { available:false } and the UI shows "no live feed" honestly.

import type { InstrumentMap } from '../services/priceService';
import type { CalEvent } from '../hooks/useEconomicCalendar';

export type Bias = 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';

export interface DriverRead {
  key: string;
  title: string;
  available: boolean;
  bias: Bias;
  strength: number;          // 0-100, mechanical
  headline: string;
  detail: string;
  source: string;
  asOf: number | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// -- 1. Risk Sentiment (SPX + NASDAQ + VIX, all real from FMP) --------------
export function riskSentimentDriver(inst: InstrumentMap | null): DriverRead {
  const spx = inst?.SPX, ndx = inst?.NASDAQ, vix = inst?.VIX;
  const haveEquities = !!(spx?.available && ndx?.available);
  const haveVix = !!vix?.available;
  if (!haveEquities && !haveVix) {
    return base('risk', 'Risk Sentiment', 'FMP');
  }

  const spxChg = spx?.changePct ?? 0;
  const ndxChg = ndx?.changePct ?? 0;
  const vixChg = vix?.changePct ?? 0;
  const vixLevel = vix?.value ?? 18;

  const eq = (spxChg + ndxChg) / 2;
  const eqNorm = clamp(eq / 2, -1, 1);
  const vixNorm = clamp(vixChg / 15, -1, 1);
  const riskScore = (eqNorm - vixNorm) / 2;
  const goldTilt = -riskScore;
  const stress = vixLevel >= 25 ? 1.25 : vixLevel >= 18 ? 1.0 : 0.9;
  const strength = Math.round(clamp(Math.abs(goldTilt) * stress * 100, 0, 100));

  let bias: Bias;
  if (goldTilt > 0.15) bias = strength >= 55 ? 'Strong Bullish' : 'Bullish';
  else if (goldTilt < -0.15) bias = strength >= 55 ? 'Strong Bearish' : 'Bearish';
  else bias = 'Neutral';

  const regime = vixLevel >= 25 ? 'stress' : vixLevel >= 18 ? 'elevated' : 'calm';
  const headline =
    goldTilt > 0.15 ? 'Risk-off' : goldTilt < -0.15 ? 'Risk-on' : 'Balanced';

  const detail =
    `Equities ${eq >= 0 ? '+' : ''}${eq.toFixed(2)}% avg, VIX ${vixChg >= 0 ? '+' : ''}${vixChg.toFixed(2)}% at ${vixLevel.toFixed(1)} (${regime}). ` +
    (goldTilt > 0.15 ? 'Haven demand supports gold.' :
     goldTilt < -0.15 ? 'Risk appetite pressures gold.' :
     'Two-way, no clear haven signal.');

  return {
    key: 'risk', title: 'Risk Sentiment', available: true,
    bias, strength, headline, detail, source: 'FMP (SPX/NDX/VIX)',
    asOf: vix?.asOf ?? spx?.asOf ?? null,
  };
}

// -- 2. XAU/USD momentum (live gold feed) -----------------------------------
export function goldMomentumDriver(price: number | null, dayOpen: number | null, connected: boolean): DriverRead {
  if (!connected || price === null || dayOpen === null || dayOpen === 0) {
    return base('xau', 'XAU/USD Momentum', 'gold feed');
  }
  const chg = ((price - dayOpen) / dayOpen) * 100;
  const strength = Math.round(clamp(Math.abs(chg) * 60, 0, 100));
  let bias: Bias;
  if (chg > 0.05) bias = chg > 0.6 ? 'Strong Bullish' : 'Bullish';
  else if (chg < -0.05) bias = chg < -0.6 ? 'Strong Bearish' : 'Bearish';
  else bias = 'Neutral';
  return {
    key: 'xau', title: 'XAU/USD Momentum', available: true,
    bias, strength,
    headline: chg >= 0 ? `Up ${chg.toFixed(2)}%` : `Down ${Math.abs(chg).toFixed(2)}%`,
    detail: `Live spot ${price.toFixed(2)}, ${chg >= 0 ? 'up' : 'down'} ${Math.abs(chg).toFixed(2)}% on the session. ` +
            (bias === 'Neutral' ? 'Two-way and balanced.' : bias.includes('Bullish') ? 'Buyers in control of the tape.' : 'Sellers pressing lower.'),
    source: 'gold feed', asOf: Date.now(),
  };
}

// -- 3. Inflation (from the Economic Calendar - real CPI/PPI prints) ---------
export function inflationDriver(events: CalEvent[] | null): DriverRead {
  if (!events || events.length === 0) return base('infl', 'Inflation (CPI/PPI)', 'Calendar');

  const isInflation = (name: string) =>
    /\bCPI\b|\bPPI\b|\bPCE\b|inflation/i.test(name);
  const released = events
    .filter((e) => isInflation(e.event) && e.currency === 'USD' && e.actual !== null && e.estimate !== null)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  if (released.length === 0) return base('infl', 'Inflation (CPI/PPI)', 'Calendar');

  const ev = released[0];
  const actual = typeof ev.actual === 'number' ? ev.actual : Number(ev.actual);
  const forecast = typeof ev.estimate === 'number' ? ev.estimate : Number(ev.estimate);
  if (!isFinite(actual) || !isFinite(forecast)) return base('infl', 'Inflation (CPI/PPI)', 'Calendar');

  const surprise = actual - forecast;
  const mag = Math.abs(surprise);
  const strength = Math.round(clamp(mag * 80, 0, 100));
  let bias: Bias;
  if (surprise > 0.05) bias = strength >= 55 ? 'Strong Bullish' : 'Bullish';
  else if (surprise < -0.05) bias = strength >= 55 ? 'Strong Bearish' : 'Bearish';
  else bias = 'Neutral';

  return {
    key: 'infl', title: 'Inflation (CPI/PPI)', available: true,
    bias, strength,
    headline: surprise > 0.05 ? 'Hotter than expected' : surprise < -0.05 ? 'Cooler than expected' : 'In line',
    detail: `${ev.event}: actual ${actual} vs forecast ${forecast} (${surprise >= 0 ? '+' : ''}${surprise.toFixed(2)} surprise). ` +
            (bias === 'Neutral' ? 'No clear gold signal.' : bias.includes('Bullish') ? 'Real-rate erosion supports gold.' : 'Cooler print eases haven demand.'),
    source: 'Economic Calendar', asOf: +new Date(ev.date),
  };
}

// -- Drivers without a free live source: honest "no feed" -------------------
const NO_FEED_DRIVERS: { key: string; title: string; source: string }[] = [
  { key: 'dxy',  title: 'Dollar Index (DXY)', source: 'no live feed' },
  { key: 'us10y', title: 'US 10Y Yield',      source: 'no live feed' },
  { key: 'real', title: 'Real Yields',        source: 'no live feed' },
  { key: 'cb',   title: 'Central Bank Buying', source: 'structural' },
  { key: 'etf',  title: 'Gold ETF Flows',     source: 'periodic' },
  { key: 'geo',  title: 'Geopolitical Risk',  source: 'qualitative' },
];

function base(key: string, title: string, source: string): DriverRead {
  return {
    key, title, available: false, bias: 'Neutral', strength: 0,
    headline: 'no live feed', detail: 'No live data source connected for this driver. Not fabricated.',
    source, asOf: null,
  };
}

export function noFeedDrivers(): DriverRead[] {
  return NO_FEED_DRIVERS.map((d) => base(d.key, d.title, d.source));
}

// -- Aggregate composite bias (only from AVAILABLE drivers) -----------------
const BIAS_SCORE: Record<Bias, number> = {
  'Strong Bearish': -2, 'Bearish': -1, 'Neutral': 0, 'Bullish': 1, 'Strong Bullish': 2,
};

export interface CompositeBias {
  bias: Bias;
  score: number;
  confidence: number;
  contributors: number;
}

export function compositeBias(drivers: DriverRead[]): CompositeBias {
  const live = drivers.filter((d) => d.available);
  if (live.length === 0) {
    return { bias: 'Neutral', score: 0, confidence: 0, contributors: 0 };
  }
  let wSum = 0, wTotal = 0;
  for (const d of live) {
    const w = Math.max(10, d.strength);
    wSum += BIAS_SCORE[d.bias] * w;
    wTotal += w;
  }
  const avg = wTotal ? wSum / wTotal : 0;
  const score = Math.round((avg / 2) * 100);

  let bias: Bias;
  if (avg > 1.0) bias = 'Strong Bullish';
  else if (avg > 0.25) bias = 'Bullish';
  else if (avg < -1.0) bias = 'Strong Bearish';
  else if (avg < -0.25) bias = 'Bearish';
  else bias = 'Neutral';

  const dirs = live.map((d) => Math.sign(BIAS_SCORE[d.bias]));
  const agree = dirs.length ? Math.abs(dirs.reduce((a, b) => a + b, 0)) / dirs.length : 0;
  const sampleFactor = clamp(live.length / 3, 0, 1);
  const confidence = Math.round(clamp(agree * 70 + sampleFactor * 30, 0, 100));

  return { bias, score, confidence, contributors: live.length };
}
