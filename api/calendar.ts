// Vercel Serverless Function -- proxies the JBlanked economic calendar so the
// browser never calls JBlanked directly (avoids CORS) and the API key stays
// server-side (never shipped to the client).
//
// Set JBLANKED_API_KEY in Vercel -> Settings -> Environment Variables
// (NOT prefixed with VITE_, so it stays server-only).

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.JBLANKED_API_KEY;
  if (!key) {
    return json({
      error: 'no-key',
      message: 'JBLANKED_API_KEY is not set on the server. Add it in Vercel -> Settings -> Environment Variables (NO VITE_ prefix), then redeploy.',
    }, 500);
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  if (!from || !to) {
    return json({ error: 'bad-request', message: 'from and to query params are required (YYYY-MM-DD).' }, 400);
  }

  const upstream = `https://www.jblanked.com/news/api/forex-factory/calendar/range/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  try {
    const res = await fetch(upstream, {
      headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${key}` },
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      let hint = text.slice(0, 200);
      if (res.status === 401 || res.status === 403) {
        hint = 'JBlanked rejected the API key (invalid, revoked, or daily free quota used up). Check usage at jblanked.com/api/usage/.';
      } else if (res.status === 429) {
        hint = 'JBlanked rate limit reached (free tier is limited per day). Try again later or add credits.';
      }
      return json({ error: 'upstream', status: res.status, message: hint }, res.status);
    }
    // Cache aggressively at the edge: JBlanked's free tier allows very few
    // requests per day, so we serve cached calendar data for 12h.
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400', // cache 12h at the edge (free-tier friendly)
      },
    });
  } catch (e) {
    return json({ error: 'fetch-failed', message: e instanceof Error ? e.message : 'fetch failed' }, 502);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
