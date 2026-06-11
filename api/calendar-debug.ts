// TEMPORARY diagnostic endpoint. Returns the raw JBlanked response so we can
// inspect exactly which fields (Actual, Outcome, etc.) are present for events
// that have NOT been released yet. REMOVE once the data shape is confirmed.

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = process.env.JBLANKED_API_KEY;
  if (!key) { res.status(500).json({ error: 'no-key', message: 'JBLANKED_API_KEY not set.' }); return; }

  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  if (!from || !to) { res.status(400).json({ error: 'bad-request', message: 'from and to required (YYYY-MM-DD).' }); return; }

  const upstream = `https://www.jblanked.com/news/api/forex-factory/calendar/range/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  try {
    const r = await fetch(upstream, {
      headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${key}` },
      cache: 'no-store',
    });
    const text = await r.text();
    if (!r.ok) { res.status(r.status).json({ error: 'upstream', status: r.status, body: text.slice(0, 300) }); return; }
    const arr = JSON.parse(text);
    const slim = Array.isArray(arr)
      ? arr.slice(0, 40).map((e: Record<string, unknown>) => ({
          Name: e.Name, Currency: e.Currency, Date: e.Date, Impact: e.Impact,
          Actual: e.Actual, Forecast: e.Forecast, Previous: e.Previous,
          Outcome: e.Outcome, Strength: e.Strength, Quality: e.Quality,
        }))
      : arr;
    res.status(200).json({ count: Array.isArray(arr) ? arr.length : 0, events: slim });
  } catch (e) {
    res.status(502).json({ error: 'fetch-failed', message: e instanceof Error ? e.message : 'failed' });
  }
}
