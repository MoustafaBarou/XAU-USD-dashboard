// ── Retail sentiment service ───────────────────────────────────────────────
// Myfxbook Community Outlook for XAU/USD via our serverless proxy
// (/api/myfxbook-sentiment). Credentials + session token stay server-side; the
// browser only ever sees the long/short figures below. No mock data — if the
// feed is unavailable the UI says so.

export interface RetailSentiment {
  symbol: string;
  longPercentage: number | null;
  shortPercentage: number | null;
  longVolume: number | null;       // lots
  shortVolume: number | null;      // lots
  longPositions: number | null;
  shortPositions: number | null;
  totalPositions: number | null;
  avgLongPrice: number | null;
  avgShortPrice: number | null;
  updatedAt: string;
}

export type SentimentResult =
  | { ok: true; data: RetailSentiment }
  | { ok: false; reason: 'no-key' | 'error' | 'empty'; message: string };

const PROXY = '/api/myfxbook-sentiment';

export const SENTIMENT_POLL_MS = 60_000; // retail outlook refreshes ~every 60s

export async function fetchRetailSentiment(): Promise<SentimentResult> {
  try {
    const res = await fetch(PROXY, { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.ok === false) {
      const reason = (body?.reason as 'no-key' | 'error' | 'empty') ?? 'error';
      const message = (body?.message as string) ?? `Sentiment HTTP ${res.status}`;
      return { ok: false, reason, message };
    }
    return {
      ok: true,
      data: {
        symbol: body.symbol ?? 'XAUUSD',
        longPercentage: body.longPercentage ?? null,
        shortPercentage: body.shortPercentage ?? null,
        longVolume: body.longVolume ?? null,
        shortVolume: body.shortVolume ?? null,
        longPositions: body.longPositions ?? null,
        shortPositions: body.shortPositions ?? null,
        totalPositions: body.totalPositions ?? null,
        avgLongPrice: body.avgLongPrice ?? null,
        avgShortPrice: body.avgShortPrice ?? null,
        updatedAt: body.updatedAt ?? new Date().toISOString(),
      },
    };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'fetch failed' };
  }
}

// ── Contrarian read ────────────────────────────────────────────────────────
// Retail crowd positioning is commonly read as a contrarian signal: when the
// crowd is heavily SHORT, that leans contrarian BULLISH for gold, and vice
// versa. We only label it a clear signal past a crowding threshold.
export type ContrarianBias = 'Bullish' | 'Bearish' | 'Neutral';

export function contrarianBias(shortPct: number | null): ContrarianBias {
  if (shortPct === null) return 'Neutral';
  if (shortPct >= 60) return 'Bullish';   // crowd short -> contrarian long
  if (shortPct <= 40) return 'Bearish';   // crowd long  -> contrarian short
  return 'Neutral';
}

export function contrarianLabel(shortPct: number | null, longPct: number | null): string {
  const b = contrarianBias(shortPct);
  if (b === 'Bullish' && shortPct !== null) return `Crowd ${Math.round(shortPct)}% short · contrarian bullish`;
  if (b === 'Bearish' && longPct !== null) return `Crowd ${Math.round(longPct)}% long · contrarian bearish`;
  return 'Crowd balanced · no contrarian edge';
}
