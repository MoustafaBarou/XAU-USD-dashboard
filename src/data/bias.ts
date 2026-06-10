import type { DriverRow } from './drivers';
import type { GoldState } from '../hooks/useGoldFeed';

export type BiasLevel = 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';

export interface BiasResult {
  level: BiasLevel;
  score: number;        // -100 .. +100
  confidence: number;   // 0 .. 100
  reasoning: string;
  topDrivers: { name: string; impact: string; contribution: number }[];
  live: boolean;        // whether the live price stream contributed
}

const sign = (i: string) => (i === 'Bullish' ? 1 : i === 'Bearish' ? -1 : 0);

/**
 * Gold Bias Engine.
 * Blends the weighted Driver Matrix (editorial until live) with the genuinely
 * live XAU/USD price action. Recompute by calling this whenever drivers or the
 * price state change — the UI does exactly that.
 */
export function computeBias(drivers: DriverRow[], g: GoldState): BiasResult {
  // 1) driver contribution: signed strength*confidence, normalised
  const contribs = drivers.map((d) => ({
    name: d.name,
    impact: d.impact,
    contribution: sign(d.impact) * (d.strength / 100) * (d.confidence / 100),
  }));
  const driverSum = contribs.reduce((a, c) => a + c.contribution, 0);
  const driverScore = Math.max(-1, Math.min(1, driverSum / 3)); // ~normalise

  // 2) live price contribution (only if feed is up)
  let priceScore = 0;
  let live = false;
  if (g.status === 'connected' && g.price !== null && g.dayOpen) {
    live = true;
    const movePct = ((g.price - g.dayOpen) / g.dayOpen) * 100;
    const h = g.history;
    const momentum = h.length >= 6 ? h[h.length - 1].p - h[h.length - 6].p : 0;
    priceScore = Math.max(-1, Math.min(1, movePct / 0.8)) * 0.6 + (momentum > 0 ? 0.4 : momentum < 0 ? -0.4 : 0);
    priceScore = Math.max(-1, Math.min(1, priceScore));
  }

  // 3) blend: drivers carry structure, price carries the live tape
  const blended = live ? driverScore * 0.55 + priceScore * 0.45 : driverScore;
  const score = Math.round(blended * 100);

  const level: BiasLevel =
    score >= 50 ? 'Strong Bullish' :
    score >= 18 ? 'Bullish' :
    score > -18 ? 'Neutral' :
    score > -50 ? 'Bearish' : 'Strong Bearish';

  // confidence: avg driver confidence, lifted by live data and signal agreement
  const avgConf = drivers.reduce((a, d) => a + d.confidence, 0) / Math.max(1, drivers.length);
  const agreement = live ? 1 - Math.min(1, Math.abs(driverScore - priceScore)) : 0.7;
  const confidence = Math.round(Math.min(92, avgConf * 0.7 + agreement * 25 + (live ? 5 : 0)));

  const top = [...contribs]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);

  const dirWord = score > 0 ? 'support' : score < 0 ? 'pressure' : 'a balanced setup for';
  const leadNames = top.filter((t) => sign(t.impact) === Math.sign(score || 1)).map((t) => t.name);
  const reasoning = live
    ? `The live tape and macro positioning combine to ${dirWord} gold. ` +
      `Price action contributes a ${priceScore >= 0 ? 'positive' : 'negative'} read; the driver matrix leans ${driverScore >= 0 ? 'bullish' : driverScore < 0 ? 'bearish' : 'neutral'}` +
      (leadNames.length ? `, led by ${leadNames.slice(0, 2).join(' and ')}.` : '.')
    : `Live price is offline, so this read reflects macro positioning only` +
      (leadNames.length ? `, led by ${leadNames.slice(0, 2).join(' and ')}.` : '.') +
      ` It will sharpen once genuine ticks resume.`;

  return { level, score, confidence, reasoning, topDrivers: top, live };
}
