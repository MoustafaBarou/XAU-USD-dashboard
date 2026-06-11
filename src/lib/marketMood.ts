import { computeGoldImpact, biasSign, type GoldBias } from './goldImpact';
import type { CalEvent } from '../hooks/useEconomicCalendar';

export interface MoodResult {
  score: number;            // 0-100
  bias: GoldBias;
  bullishPct: number;
  bearishPct: number;
  sampleSize: number;
  topReason: string | null;
}

function impactWeight(impact: CalEvent['impact']): number {
  return impact === 'High' ? 3 : impact === 'Medium' ? 2 : impact === 'Low' ? 1 : 0.5;
}

/**
 * Aggregate the calendar into a single 0-100 gold-mood score.
 * 50 = balanced. >50 leans bullish gold, <50 bearish.
 */
export function computeMarketMood(events: CalEvent[]): MoodResult {
  let bullW = 0;
  let bearW = 0;
  let netWeighted = 0;
  let totalWeight = 0;
  let scored = 0;
  let topStrength = -1;
  let topReason: string | null = null;

  for (const e of events) {
    const impact = computeGoldImpact({
      event: e.event, actual: e.actual, estimate: e.estimate, previous: e.previous,
    });
    const w = impactWeight(e.impact);
    const sign = biasSign(impact.bias);

    if (sign !== 0) {
      scored += 1;
      const contribution = (impact.strength / 100) * w;
      if (sign > 0) bullW += contribution; else bearW += contribution;
      netWeighted += sign * contribution;
      totalWeight += contribution;
      if (impact.strength > topStrength) { topStrength = impact.strength; topReason = impact.reason; }
    }
  }

  const tilt = totalWeight > 0 ? netWeighted / totalWeight : 0;
  const score = Math.round(50 + tilt * 50);
  const clamped = Math.max(0, Math.min(100, score));

  const denom = bullW + bearW;
  const bullishPct = denom > 0 ? Math.round((bullW / denom) * 100) : 0;
  const bearishPct = denom > 0 ? 100 - bullishPct : 0;

  const bias: GoldBias =
    clamped >= 60 ? 'Bullish Gold' : clamped <= 39 ? 'Bearish Gold' : 'Neutral';

  return { score: clamped, bias, bullishPct, bearishPct, sampleSize: scored, topReason };
}

export function moodColor(score: number): string {
  if (score >= 60) return '#00D98B';
  if (score <= 39) return '#FF4D6D';
  return '#FFC857';
}
export function moodLabel(score: number): string {
  if (score >= 60) return 'BULLISH GOLD';
  if (score <= 39) return 'BEARISH GOLD';
  return 'NEUTRAL';
}
