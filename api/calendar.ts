// Vercel Serverless Function - proxies the JBlanked economic calendar so the
// browser never calls JBlanked directly (avoids CORS) and the API key stays
// server-side (never shipped to the client).
//
// Set JBLANKED_API_KEY in Vercel -> Settings -> Environment Variables
// (NOT prefixed with VITE_, so it stays server-only).

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = process.env.JBLANKED_API_KEY;
  if (!key) {
    res.status(500).json({
      error: 'no-key',
      message: 'JBLANKED_API_KEY is not set on the server. Add it in Vercel -> Settings -> Environment Variables (NO VITE_ prefix), then redeploy.',
    });
    return;
  }

  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  if (!from || !to) {
    res.status(400).json({ error: 'bad-request', message: 'from and to query params are required (YYYY-MM-DD).' });
    return;
  }

  const upstream = `https://www.jblanked.com/news/api/forex-factory/calendar/range/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  try {
    const upstreamRes = await fetch(upstream, {
      headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${key}` },
      cache: 'no-store',
    });
    const text = await upstreamRes.text();
    if (!upstreamRes.ok) {
      let hint = text.slice(0, 200);
      if (upstreamRes.status === 401 || upstreamRes.status === 403) {
        hint = 'JBlanked rejected the API key (invalid, revoked, or daily free quota used up). Check usage at jblanked.com/api/usage/.';
      } else if (upstreamRes.status === 429) {
        hint = 'JBlanked rate limit reached (free tier is limited per day). Try again later or add credits.';
      }
      res.status(upstreamRes.status).json({ error: 'upstream', status: upstreamRes.status, message: hint });
      return;
    }
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: 'fetch-failed', message: e instanceof Error ? e.message : 'fetch failed' });
  }
}
