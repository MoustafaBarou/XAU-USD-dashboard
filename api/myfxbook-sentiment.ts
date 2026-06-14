// Vercel Serverless Function — Myfxbook Community Outlook (retail sentiment).
//
// Logs in to Myfxbook with email+password (server-side only), reuses the
// session token across warm invocations, fetches the community outlook and
// returns ONLY the XAUUSD long/short figures to the browser. Credentials and
// the session token never reach the client.
//
// Set in Vercel -> Settings -> Environment Variables (NO VITE_ prefix, so they
// stay server-only): MYFXBOOK_EMAIL, MYFXBOOK_PASSWORD. Redeploy after adding.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const API = 'https://www.myfxbook.com/api';

// Module-scope cache: persists while the serverless instance stays warm, so we
// don't log in on every request. Myfxbook sessions are IP-bound and expire
// after ~1 month; if the IP changes or the token lapses, the outlook call
// returns error:true and we re-login once (see getOutlook).
let cachedSession: string | null = null;

async function login(email: string, password: string): Promise<string> {
  const url = `${API}/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = (await res.json()) as { error?: boolean; message?: string; session?: string };
  if (data.error || !data.session) {
    throw new Error(data.message || 'Myfxbook login failed (check credentials / disable 2FA).');
  }
  return data.session;
}

interface OutlookSymbol {
  name?: string;
  longPercentage?: number | string;
  shortPercentage?: number | string;
  longVolume?: number | string;
  shortVolume?: number | string;
  longPositions?: number | string;
  shortPositions?: number | string;
  totalPositions?: number | string;
  avgLongPrice?: number | string;
  avgShortPrice?: number | string;
}
interface OutlookResponse {
  error?: boolean;
  message?: string;
  symbols?: OutlookSymbol[];
  outlook?: { symbols?: OutlookSymbol[] };
  communityOutlook?: { symbols?: OutlookSymbol[] };
}

// The success shape is documented inconsistently across Myfxbook references
// (sometimes top-level `symbols`, sometimes nested). Pull from whichever exists.
function extractSymbols(data: OutlookResponse): OutlookSymbol[] {
  if (Array.isArray(data.symbols)) return data.symbols;
  if (Array.isArray(data.outlook?.symbols)) return data.outlook!.symbols!;
  if (Array.isArray(data.communityOutlook?.symbols)) return data.communityOutlook!.symbols!;
  return [];
}

async function fetchOutlook(session: string): Promise<OutlookResponse> {
  const url = `${API}/get-community-outlook.json?session=${encodeURIComponent(session)}`;
  const res = await fetch(url, { cache: 'no-store' });
  return (await res.json()) as OutlookResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const email = process.env.MYFXBOOK_EMAIL;
  const password = process.env.MYFXBOOK_PASSWORD;
  if (!email || !password) {
    res.status(500).json({
      ok: false,
      reason: 'no-key',
      message: 'MYFXBOOK_EMAIL / MYFXBOOK_PASSWORD are not set on the server. Add them in Vercel -> Settings -> Environment Variables (NO VITE_ prefix), then redeploy.',
    });
    return;
  }

  try {
    // Try with the cached session; if the token is stale (error:true) log in
    // once more and retry. This covers expiry and Vercel egress-IP changes.
    if (!cachedSession) cachedSession = await login(email, password);
    let data = await fetchOutlook(cachedSession);
    if (data.error) {
      cachedSession = await login(email, password);
      data = await fetchOutlook(cachedSession);
    }
    if (data.error) {
      res.status(502).json({ ok: false, reason: 'error', message: data.message || 'Myfxbook outlook error.' });
      return;
    }

    const symbols = extractSymbols(data);
    const x = symbols.find((s) => String(s.name ?? '').toUpperCase() === 'XAUUSD');
    if (!x) {
      res.status(404).json({ ok: false, reason: 'empty', message: 'XAUUSD not found in the community outlook.' });
      return;
    }

    const num = (v: unknown): number | null =>
      v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v);

    const payload = {
      ok: true as const,
      symbol: 'XAUUSD',
      longPercentage: num(x.longPercentage),
      shortPercentage: num(x.shortPercentage),
      longVolume: num(x.longVolume),
      shortVolume: num(x.shortVolume),
      longPositions: num(x.longPositions),
      shortPositions: num(x.shortPositions),
      totalPositions: num(x.totalPositions),
      avgLongPrice: num(x.avgLongPrice),
      avgShortPrice: num(x.avgShortPrice),
      updatedAt: new Date().toISOString(),
    };

    // Edge-cache so we hit Myfxbook at most ~once/55s regardless of traffic.
    res.setHeader('Cache-Control', 's-maxage=55, stale-while-revalidate=120');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(payload);
  } catch (e) {
    cachedSession = null; // force a fresh login on the next request
    res.status(502).json({ ok: false, reason: 'error', message: e instanceof Error ? e.message : 'fetch failed' });
  }
}
