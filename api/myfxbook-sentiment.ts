// Vercel Serverless Function — Myfxbook Community Outlook (XAU/USD retail sentiment).
//
// This function does NOT talk to Myfxbook. Myfxbook sessions are IP-bound and
// Vercel's egress IP changes even within one invocation, so request-time login
// is impossible here (it always got "Invalid session"). Instead a scheduled
// GitHub Actions job (.github/workflows/sentiment.yml + scripts/fetch-sentiment.mjs)
// logs in from a single stable IP and upserts the XAUUSD figures into Supabase.
// This function only reads that one row and returns it in the exact JSON shape
// the frontend already expects (sentimentService.ts is unchanged).
//
// Reads with the PUBLIC Supabase creds (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY,
// already set on Vercel). The service-role key is NOT used or referenced here —
// it lives only as a GitHub Actions secret.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Beyond this age the upstream job is considered to be failing; we report the
// feed as delayed rather than serving frozen figures as if they were live.
const STALE_MS = 15 * 60 * 1000;

interface SentimentRow {
  symbol: string;
  long_percentage: number | null;
  short_percentage: number | null;
  long_volume: number | null;
  short_volume: number | null;
  long_positions: number | null;
  short_positions: number | null;
  total_positions: number | null;
  avg_long_price: number | null;
  avg_short_price: number | null;
  updated_at: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    res.status(500).json({
      ok: false,
      reason: 'error',
      message: 'Supabase is not configured on the server (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
    });
    return;
  }

  try {
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('retail_sentiment')
      .select('*')
      .eq('symbol', 'XAUUSD')
      .maybeSingle<SentimentRow>();

    if (error) {
      res.status(502).json({ ok: false, reason: 'error', message: `Sentiment store error: ${error.message}` });
      return;
    }
    if (!data) {
      res.status(404).json({ ok: false, reason: 'empty', message: 'Retail outlook not available yet.' });
      return;
    }

    const ageMs = Date.now() - new Date(data.updated_at).getTime();
    if (!isFinite(ageMs) || ageMs > STALE_MS) {
      const ageMin = isFinite(ageMs) ? Math.round(ageMs / 60_000) : null;
      res.status(502).json({
        ok: false,
        reason: 'error',
        message: ageMin === null
          ? 'Retail outlook timestamp is invalid; live feed delayed.'
          : `Retail outlook last updated ${ageMin} min ago; live feed delayed.`,
      });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=55, stale-while-revalidate=120');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      ok: true,
      symbol: data.symbol,
      longPercentage: data.long_percentage,
      shortPercentage: data.short_percentage,
      longVolume: data.long_volume,
      shortVolume: data.short_volume,
      longPositions: data.long_positions,
      shortPositions: data.short_positions,
      totalPositions: data.total_positions,
      avgLongPrice: data.avg_long_price,
      avgShortPrice: data.avg_short_price,
      updatedAt: data.updated_at,
    });
  } catch (e) {
    res.status(502).json({
      ok: false,
      reason: 'error',
      message: e instanceof Error ? e.message : 'Failed to read retail sentiment.',
    });
  }
}
