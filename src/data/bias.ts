import type { DriverRow } from './drivers';
import type { GoldState } from '../hooks/useGoldFeed';
import type { Quote } from '../services/priceService';

export type BiasLevel = 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';

export interface BiasSignal {
  name: string;
  value: string;
  impact: 'Bullish' | 'Bearish' | 'Neutral';
  live: boolean;
  contribution: number;
}

export interface BiasResult {
  level: BiasLevel;
  score: number;        // -100 .. +100
  confidence: number;   // 0 .. 100
  reasoning: string;
  signals: BiasSignal[];
  topDrivers: { name: string; impact: string; contribution: number }[];
  live: boolean;        // whether ANY live data contributed
  liveInputs: string[]; // which inputs were live
}

const sign = (i: string) => (i === 'Bullish' ? 1 : i === 'Bearish' ? -1 : 0);
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export interface BiasInputs {
  drivers: DriverRow[];
  g: GoldState;
  dxy?: Quote | null;
  us10y?: Quote | null;
}

/**
 * Gold Bias Engine — now driven by REAL live data where available:
 *   • XAU/USD live price action (gold-api.com)
 *   • DXY live (FMP)  — rising DXY = bearish gold
 *   • US10Y live (FMP) — rising yields = bearish gold
 * Editorial Driver Matrix fills the remaining structural picture. Each live
 * input is labelled; nothing is fabricated. Recompute whenever inputs change.
 */
export function computeBias({ drivers, g, dxy, us10y }: BiasInputs): BiasResult {
  const signals: BiasSignal[] = [];
  const liveInputs: string[] = [];
  let liveScore = 0;
  let liveWeight = 0;

  // 1) Live XAU/USD price action
  if (g.status === 'connected' && g.price !== null && g.dayOpen) {
    const movePct = ((g.price - g.dayOpen) / g.dayOpen) * 100;
    const h = g.history;
    const momentum = h.length >= 6 ? h[h.length - 1].p - h[h.length - 6].p : 0;
    const ps = clamp(clamp(movePct / 0.8) * 0.6 + (momentum > 0 ? 0.4 : momentum < 0 ? -0.4 : 0));
    const impact = ps > 0.1 ? 'Bullish' : ps < -0.1 ? 'Bearish' : 'Neutral';
    signals.push({ name: 'XAU/USD price action', value: `${g.price.toFixed(2)} (${movePct >= 0 ? '+' : ''}${movePct.toFixed(2)}%)`, impact, live: true, contribution: ps });
    liveScore += ps * 0.40; liveWeight += 0.40; liveInputs.push('XAU/USD');
  } else {
    signals.push({ name: 'XAU/USD price action', value: 'DATA UNAVAILABLE', impact: 'Neutral', live: false, contribution: 0 });
  }

  // 2) Live DXY — inverse to gold
  if (dxy && dxy.available && dxy.changePct !== null) {
    const ds = clamp(-dxy.changePct / 0.5); // -0.5% DXY ~ +1 gold
    const impact = ds > 0.1 ? 'Bullish' : ds < -0.1 ? 'Bearish' : 'Neutral';
    signals.push({ name: 'Dollar Index (DXY)', value: `${dxy.value?.toFixed(2)} (${dxy.changePct >= 0 ? '+' : ''}${dxy.changePct.toFixed(2)}%)`, impact, live: true, contribution: ds });
    liveScore += ds * 0.30; liveWeight += 0.30; liveInputs.push('DXY');
  } else {
    signals.push({ name: 'Dollar Index (DXY)', value: 'DATA UNAVAILABLE', impact: 'Neutral', live: false, contribution: 0 });
  }

  // 3) Live US10Y — inverse to gold
  if (us10y && us10y.available && us10y.changePct !== null) {
    const ys = clamp(-us10y.changePct / 1.5);
    const impact = ys > 0.1 ? 'Bullish' : ys < -0.1 ? 'Bearish' : 'Neutral';
    signals.push({ name: 'US 10Y Yield', value: `${us10y.value?.toFixed(2)}% (${us10y.changePct >= 0 ? '+' : ''}${us10y.changePct.toFixed(2)}%)`, impact, live: true, contribution: ys });
    liveScore += ys * 0.30; liveWeight += 0.30; liveInputs.push('US10Y');
  } else {
    signals.push({ name: 'US 10Y Yield', value: 'DATA UNAVAILABLE', impact: 'Neutral', live: false, contribution: 0 });
  }

  // 4) Editorial Driver Matrix (structural backdrop)
  const contribs = drivers.map((d) => ({
    name: d.name, impact: d.impact,
    contribution: sign(d.impact) * (d.strength / 100) * (d.confidence / 100),
  }));
  const driverScore = clamp(contribs.reduce((a, c) => a + c.contribution, 0) / 3);

  // Blend: live inputs dominate when present; drivers fill the rest.
  const live = liveWeight > 0;
  const liveAvg = liveWeight > 0 ? liveScore / liveWeight : 0;
  const blended = live ? liveAvg * 0.65 + driverScore * 0.35 : driverScore;
  const score = Math.round(blended * 100);

  const level: BiasLevel =
    score >= 50 ? 'Strong Bullish' :
    score >= 18 ? 'Bullish' :
    score > -18 ? 'Neutral' :
    score > -50 ? 'Bearish' : 'Strong Bearish';

  const avgConf = drivers.reduce((a, d) => a + d.confidence, 0) / Math.max(1, drivers.length);
  const liveBoost = liveInputs.length * 6; // more live inputs = more confidence
  const confidence = Math.round(Math.min(94, avgConf * 0.55 + liveBoost + (live ? 8 : 0)));

  const top = [...contribs].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 3);

  const liveSignals = signals.filter((s) => s.live);
  const dirWord = score > 18 ? 'supports' : score < -18 ? 'pressures' : 'is balanced for';
  let reasoning: string;
  if (liveSignals.length > 0) {
    const bull = liveSignals.filter((s) => s.impact === 'Bullish').map((s) => s.name);
    const bear = liveSignals.filter((s) => s.impact === 'Bearish').map((s) => s.name);
    reasoning =
      `Live data (${liveInputs.join(', ')}) ${dirWord} gold. ` +
      (bull.length ? `Supportive: ${bull.join(', ')}. ` : '') +
      (bear.length ? `Headwinds: ${bear.join(', ')}. ` : '') +
      `Structural backdrop from the driver matrix leans ${driverScore >= 0.1 ? 'bullish' : driverScore <= -0.1 ? 'bearish' : 'neutral'}.`;
  } else {
    reasoning = `No live market data is currently available, so this read reflects the editorial driver matrix only and will sharpen once feeds reconnect.`;
  }

  return { level, score, confidence, reasoning, signals, topDrivers: top, live, liveInputs };
}
