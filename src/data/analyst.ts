import type { GoldState } from '../hooks/useGoldFeed';
import { DRIVERS, type DriverRow } from './drivers';

/**
 * Dynamic analyst engine.
 *
 * Honesty contract:
 *  - This narrates the ONE genuinely live signal the terminal has: the real
 *    XAU/USD spot price stream (direction, session move, momentum, volatility,
 *    range position, tick cadence). Every sentence is derived from observed data.
 *  - It does NOT invent live values for DXY/yields/inflation/flows — those are
 *    not wired to a live feed. Driver context is drawn from the labelled
 *    editorial readings in drivers.ts and described as "positioning", not as
 *    live prints. When a real macro feed is connected, this same function
 *    becomes fully live with no structural change.
 */

export interface AnalystRead {
  headline: string;
  whatChanged: string;
  whyChanged: string;
  whyItMatters: string;
  watchNext: string;
  regime: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  confidence: number; // 0-100, scales with how much real data we've observed
  live: boolean;      // false when feed is down -> we say so plainly
}

function pct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }
function usd(n: number) { return `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}`; }

function netDriverLean(): { lean: number; top: DriverRow } {
  // sum of signed strength*confidence across editorial driver readings
  let lean = 0;
  for (const d of DRIVERS) {
    const sign = d.impact === 'Bullish' ? 1 : d.impact === 'Bearish' ? -1 : 0;
    lean += sign * (d.strength / 100) * (d.confidence / 100);
  }
  const top = [...DRIVERS].sort((a, b) => b.strength * b.confidence - a.strength * a.confidence)[0];
  return { lean, top };
}

export function analyse(g: GoldState): AnalystRead {
  const { lean, top } = netDriverLean();
  const driverBias = lean > 0.15 ? 'Bullish' : lean < -0.15 ? 'Bearish' : 'Neutral';

  // ---- Feed down: be explicit, do not fabricate ----
  if (g.status === 'error' || g.status === 'disconnected' || g.price === null) {
    return {
      headline: 'Live price feed offline — analysis paused',
      whatChanged: 'The real-time XAU/USD spot stream is not currently delivering ticks, so no price-derived read can be produced.',
      whyChanged: g.detail ? `The data source reported: ${g.detail}.` : 'The data source stopped responding.',
      whyItMatters: 'AURUM will not infer or fabricate price action. Commentary resumes the moment genuine ticks return.',
      watchNext: `Standing macro positioning (editorial): net ${driverBias.toLowerCase()}, led by ${top.name}. Reconnect the feed for a live read.`,
      regime: 'Feed offline',
      bias: driverBias,
      confidence: 0,
      live: false,
    };
  }

  const open = g.dayOpen ?? g.price;
  const move = g.price - open;
  const movePct = open ? (move / open) * 100 : 0;
  const rangePos = g.high !== null && g.low !== null && g.high > g.low
    ? (g.price - g.low) / (g.high - g.low) : 0.5; // 0 = at low, 1 = at high
  const atr = g.atr ?? 0;
  const ticks = g.tickCount;

  // recent momentum from the last slice of history
  const h = g.history;
  let momentum = 0;
  if (h.length >= 6) {
    const recent = h.slice(-6);
    momentum = recent[recent.length - 1].p - recent[0].p;
  }
  const dirWord = g.direction === 'up' ? 'bid higher' : g.direction === 'down' ? 'offered lower' : 'holding flat';

  // price-derived bias, then blended with editorial driver lean
  const priceLean = (movePct > 0.05 ? 1 : movePct < -0.05 ? -1 : 0) * 0.6 + (momentum > 0 ? 0.4 : momentum < 0 ? -0.4 : 0);
  const blended = priceLean * 0.6 + lean * 1.5;
  const bias = blended > 0.2 ? 'Bullish' : blended < -0.2 ? 'Bearish' : 'Neutral';

  // confidence grows with observed ticks (more real data = more confident), capped
  const confidence = Math.min(88, 35 + Math.min(ticks, 120) * 0.35 + Math.abs(blended) * 12);

  const rangeDesc =
    rangePos > 0.8 ? 'pressing the upper end of the session range' :
    rangePos < 0.2 ? 'sitting near the session low' :
    rangePos > 0.6 ? 'in the upper half of the range' :
    rangePos < 0.4 ? 'in the lower half of the range' : 'mid-range';

  const volDesc = atr > 6 ? 'elevated' : atr > 2.5 ? 'moderate' : 'subdued';

  const headline =
    bias === 'Bullish' ? `Gold ${dirWord}, ${pct(movePct)} on the session` :
    bias === 'Bearish' ? `Gold ${dirWord}, ${pct(movePct)} on the session` :
    `Gold ${dirWord} — two-way and balanced`;

  const whatChanged =
    `Spot is ${g.price.toFixed(2)}, ${usd(move)} (${pct(movePct)}) from the session open of ${open.toFixed(2)}, ` +
    `currently ${rangeDesc} (H ${g.high?.toFixed(2)} / L ${g.low?.toFixed(2)}). ` +
    `Short-term momentum over the last few ticks is ${momentum > 0 ? 'positive' : momentum < 0 ? 'negative' : 'flat'} and tick activity stands at ${ticks}.`;

  const whyChanged =
    momentum > 0
      ? `Buyers have controlled the recent tape, lifting price off support; the tone is consistent with the standing macro lean toward ${driverBias.toLowerCase()} conditions, where ${top.name} is the dominant driver.`
      : momentum < 0
      ? `Sellers have had the recent edge, pulling price back from intraday highs; this leans against the structural ${driverBias.toLowerCase()} positioning, with ${top.name} still the heaviest-weighted driver in the matrix.`
      : `Order flow is balanced with no decisive side; price is consolidating while the structural picture stays ${driverBias.toLowerCase()}, anchored by ${top.name}.`;

  const whyItMatters =
    `Realised volatility is ${volDesc} (ATR proxy ${atr.toFixed(2)}). ` +
    (bias === 'Bullish'
      ? `With price ${rangeDesc} and momentum supportive, dips are more likely to be defended than sold while this holds.`
      : bias === 'Bearish'
      ? `With price ${rangeDesc} and momentum heavy, rallies are more likely to be faded unless buyers reclaim the session open at ${open.toFixed(2)}.`
      : `Range conditions favour mean-reversion over trend-following until price breaks decisively beyond ${g.high?.toFixed(2)} or ${g.low?.toFixed(2)}.`);

  const watchNext =
    `Watch the session open at ${open.toFixed(2)} as the intraday pivot, and the ${g.high?.toFixed(2)} / ${g.low?.toFixed(2)} extremes for a break. ` +
    `On the macro side, the matrix is led by ${top.name} (${top.impact.toLowerCase()}, strength ${top.strength}); a shift there would reframe the bias. ` +
    `A decisive move in real yields remains the key invalidation for the gold case.`;

  const regime =
    bias === 'Bullish' ? 'Constructive — price and positioning aligned' :
    bias === 'Bearish' ? 'Defensive — price pressing against positioning' :
    'Balanced — awaiting a catalyst';

  return { headline, whatChanged, whyChanged, whyItMatters, watchNext, regime, bias, confidence: Math.round(confidence), live: true };
}
