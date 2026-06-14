// Scheduled job — Myfxbook Community Outlook (XAU/USD retail sentiment) -> Supabase.
//
// WHY THIS RUNS HERE AND NOT ON VERCEL:
// Myfxbook sessions are IP-bound. On Vercel the egress IP changes even *within a
// single invocation* (between the login fetch and the outlook fetch), so the
// session token is rejected with "Invalid session" no matter what. A GitHub
// Actions job runs all steps on one runner VM with one egress IP for the whole
// run, so login + outlook back-to-back come from a single IP. We log in fresh
// every run and only write to Supabase on success — a good row is never
// overwritten with nothing.
//
// REQUIRED ENV (GitHub Actions secrets, NO VITE_ prefix — server-side only):
//   MYFXBOOK_EMAIL, MYFXBOOK_PASSWORD
//   SUPABASE_URL                  (same value as VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY     (service-role key; bypasses RLS to write.
//                                  MUST exist ONLY as a GitHub Actions secret —
//                                  never in Vercel env, the client bundle, or a
//                                  committed file.)
//
// Exits non-zero if it never succeeds, so the Actions run goes red.

import { createClient } from '@supabase/supabase-js';

const API = 'https://www.myfxbook.com/api';
const MAX_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = [0, 2000, 5000, 10000]; // wait before attempt N

// Some upstreams reject the default Node/undici UA; present as a normal client.
const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Mask a session token for logging: keep enough to compare across attempts,
// never reveal the full value.
function maskSession(s) {
  if (!s) return '(none)';
  if (s.length <= 6) return `len=${s.length}`;
  return `${s.slice(0, 3)}…${s.slice(-2)} (len=${s.length})`;
}

// Collect Set-Cookie(s) and reduce to a forwardable "k=v; k2=v2" string.
function extractCookies(headers) {
  const list =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : headers.get('set-cookie')
        ? [headers.get('set-cookie')]
        : [];
  const pairs = list.map((c) => c.split(';')[0].trim()).filter(Boolean);
  return pairs.length ? pairs.join('; ') : null;
}

async function getJson(url, cookie) {
  const headers = { ...COMMON_HEADERS };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(url, { cache: 'no-store', headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON (HTML, block page, etc.) */
  }
  return {
    status: res.status,
    json,
    rawSnippet: text.slice(0, 300),
    contentType: res.headers.get('content-type') ?? '(none)',
    cookies: extractCookies(res.headers),
  };
}

async function login(email, password) {
  const url = `${API}/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const f = await getJson(url);
  const j = f.json ?? {};
  return {
    session: typeof j.session === 'string' && j.session !== '' ? j.session : null,
    cookies: f.cookies,
    status: f.status,
    error: j.error,
    message: typeof j.message === 'string' ? j.message : '',
    contentType: f.contentType,
    rawSnippet: f.rawSnippet,
  };
}

// Success shape is documented inconsistently — pull symbols from whichever exists.
function extractSymbols(j) {
  if (!j) return [];
  if (Array.isArray(j.symbols)) return j.symbols;
  if (Array.isArray(j.outlook?.symbols)) return j.outlook.symbols;
  if (Array.isArray(j.communityOutlook?.symbols)) return j.communityOutlook.symbols;
  return [];
}

const num = (v) =>
  v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v);

// One login -> outlook -> XAUUSD attempt. Returns the symbol object or throws.
// Logs full diagnostics per stage (Actions logs are private). Never logs the
// password or the full session token.
async function fetchXauusd(email, password, attempt) {
  // ── login ──
  const l = await login(email, password);
  console.log(
    `  [attempt ${attempt}] login: status=${l.status} error=${JSON.stringify(l.error)} ` +
      `message=${JSON.stringify(l.message)} contentType=${l.contentType} ` +
      `session=${maskSession(l.session)} cookie=${l.cookies ? 'present' : 'none'}`,
  );
  if (!l.session) {
    // No token at all — surface the raw login body so we can see HTML/block pages.
    console.log(`  [attempt ${attempt}] login raw body (first 300): ${JSON.stringify(l.rawSnippet)}`);
    throw new Error(`login failed (status ${l.status}): ${l.message || 'no session token returned'}`);
  }

  // ── outlook ──
  const url = `${API}/get-community-outlook.json?session=${encodeURIComponent(l.session)}`;
  const o = await getJson(url, l.cookies);
  // ALWAYS log the outlook status, content-type, and the literal raw body
  // (no JSON parse) so we can tell JSON-error vs HTML/block-page vs rate-limit.
  console.log(
    `  [attempt ${attempt}] outlook: status=${o.status} contentType=${o.contentType} ` +
      `parsedJSON=${o.json ? 'yes' : 'no'} cookieForwarded=${l.cookies ? 'yes' : 'no'}`,
  );
  console.log(`  [attempt ${attempt}] outlook raw body (first 300): ${JSON.stringify(o.rawSnippet)}`);

  if (!o.json) {
    throw new Error(`outlook returned non-JSON (status ${o.status}); see raw body above`);
  }
  if (o.json.error) {
    throw new Error(`outlook error: ${o.json.message || 'Invalid session'}`);
  }
  const x = extractSymbols(o.json).find((s) => String(s.name ?? '').toUpperCase() === 'XAUUSD');
  if (!x) throw new Error('XAUUSD not found in community outlook');
  return x;
}

async function main() {
  const email = process.env.MYFXBOOK_EMAIL;
  const password = process.env.MYFXBOOK_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !email && 'MYFXBOOK_EMAIL',
    !password && 'MYFXBOOK_PASSWORD',
    !supabaseUrl && 'SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean);
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(', ')}`);
    process.exit(1);
  }

  let symbol = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (RETRY_BACKOFF_MS[attempt - 1]) await sleep(RETRY_BACKOFF_MS[attempt - 1]);
    try {
      symbol = await fetchXauusd(email, password, attempt);
      console.log(`Fetched XAUUSD outlook on attempt ${attempt}.`);
      break;
    } catch (e) {
      lastErr = e;
      console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (!symbol) {
    console.error(`All ${MAX_ATTEMPTS} attempts failed. Not writing to Supabase. Last error: ${lastErr?.message ?? lastErr}`);
    process.exit(1);
  }

  const row = {
    symbol: 'XAUUSD',
    long_percentage: num(symbol.longPercentage),
    short_percentage: num(symbol.shortPercentage),
    long_volume: num(symbol.longVolume),
    short_volume: num(symbol.shortVolume),
    long_positions: num(symbol.longPositions),
    short_positions: num(symbol.shortPositions),
    total_positions: num(symbol.totalPositions),
    avg_long_price: num(symbol.avgLongPrice),
    avg_short_price: num(symbol.avgShortPrice),
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.from('retail_sentiment').upsert(row, { onConflict: 'symbol' });
  if (error) {
    console.error(`Supabase upsert failed: ${error.message}`);
    process.exit(1);
  }

  console.log(
    `Wrote XAUUSD: long ${row.long_percentage}% / short ${row.short_percentage}% at ${row.updated_at}`,
  );
}

main().catch((e) => {
  console.error(`Unexpected failure: ${e instanceof Error ? e.stack : e}`);
  process.exit(1);
});
