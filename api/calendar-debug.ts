// TEMPORARY diagnostic endpoint. Returns the raw JBlanked response for one day
// so we can inspect exactly which fields (Actual, Outcome, etc.) are present
// for events that have NOT been released yet.
//
// Usage: visit /api/calendar-debug?from=YYYY-MM-DD&to=YYYY-MM-DD on your site.
// REMOVE this file once the data shape is confirmed.

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.JBLANKED_API_KEY;
  if (!key) {
    return json({ error: 'no-key', message: 'JBLANKED_API_KEY not set.' }, 500);
  }
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  if (!from || !to) {
    return json({ error: 'bad-request', message: 'from and to required (YYYY-MM-DD).' }, 400);
  }
  const upstream = `https://www.jblanked.com/news/api/forex-factory/calendar/range/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  try {
    const res = await fetch(upstream, {
      headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${key}` },
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) return json({ error: 'upstream', status: res.status, body: text.slice(0, 300) }, res.status);
    const arr = JSON.parse(text);
    const slim = Array.isArray(arr)
      ? arr.slice(0, 30).map((e: Record<string, unknown>) => ({
          Name: e.Name, Currency: e.Currency, Date: e.Date, Impact: e.Impact,
          Actual: e.Actual, Forecast: e.Forecast, Previous: e.Previous,
          Outcome: e.Outcome, Strength: e.Strength, Quality: e.Quality,
        }))
      : arr;
    return json({ count: Array.isArray(arr) ? arr.length : 0, events: slim }, 200);
  } catch (e) {
    return json({ error: 'fetch-failed', message: e instanceof Error ? e.message : 'failed' }, 502);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
