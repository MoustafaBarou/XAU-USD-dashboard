// Vercel Serverless Function — Myfxbook Community Outlook (retail sentiment).
//
// Logs in to Myfxbook with email+password (server-side only) and fetches the
// community outlook, returning ONLY the XAUUSD long/short figures. Credentials
// and the session token never reach the client.
//
// Set in Vercel -> Settings -> Environment Variables (NO VITE_ prefix, so they
// stay server-only): MYFXBOOK_EMAIL, MYFXBOOK_PASSWORD. Redeploy after adding.
//
// SESSION BINDING: Myfxbook sessions are IP-bound (and appear to be cookie-bound
// too). On Vercel the egress IP can change between invocations, so we DO NOT
// cache the token across invocations. Each request logs in and calls the outlook
// back-to-back within the SAME invocation (best chance of one egress IP), and
// forwards the login's Set-Cookie onto the outlook call. We retry the whole
// login->outlook pair a few times if the token is still rejected.
//
// ⚠️ TEMP DIAGNOSTIC MODE: on failure this returns a `debug` object (login
// status/error/message, masked session, whether a cookie was forwarded, raw
// snippets). Password and the full token are never returned. Remove the `debug`
// surfacing once the feed works (search for "TEMP DIAGNOSTIC").

import type { VercelRequest, VercelResponse } from '@vercel/node';

const API = 'https://www.myfxbook.com/api';
const MAX_ATTEMPTS = 3;

// Some upstreams reject the default Node/undici UA; present as a normal client.
const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

interface Fetched {
  status: number;
  json: Record<string, unknown> | null;
  rawSnippet: string;  // first 300 chars, for non-JSON bodies (HTML, blocks)
  cookies: string | null; // name=value pairs from Set-Cookie, ready to forward
}

// Collect Set-Cookie(s) and reduce to a forwardable "k=v; k2=v2" string.
function extractCookies(headers: Headers): string | null {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  const list = typeof h.getSetCookie === 'function'
    ? h.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie') as string] : []);
  const pairs = list.map((c) => c.split(';')[0].trim()).filter(Boolean);
  return pairs.length ? pairs.join('; ') : null;
}

async function getJson(url: string, cookie?: string | null): Promise<Fetched> {
  const headers: Record<string, string> = { ...COMMON_HEADERS };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(url, { cache: 'no-store', headers });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* not JSON */ }
  return { status: res.status, json, rawSnippet: text.slice(0, 300), cookies: extractCookies(res.headers) };
}

function maskSession(s: string | null): string {
  if (!s) return '(none)';
  if (s.length <= 6) return `len=${s.length}`;
  return `${s.slice(0, 3)}…${s.slice(-2)} (len=${s.length})`;
}

interface LoginInfo {
  session: string | null;
  cookies: string | null;
  status: number;
  error: unknown;
  message: string;
  rawSnippet: string;
}

async function login(email: string, password: string): Promise<LoginInfo> {
  const url = `${API}/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const f = await getJson(url);
  const j = f.json ?? {};
  return {
    session: typeof j.session === 'string' && j.session !== '' ? j.session : null,
    cookies: f.cookies,
    status: f.status,
    error: j.error,
    message: typeof j.message === 'string' ? j.message : '',
    rawSnippet: f.rawSnippet,
  };
}

interface OutlookSymbol {
  name?: string;
  longPercentage?: number | string; shortPercentage?: number | string;
  longVolume?: number | string; shortVolume?: number | string;
  longPositions?: number | string; shortPositions?: number | string;
  totalPositions?: number | string;
  avgLongPrice?: number | string; avgShortPrice?: number | string;
}

// The success shape is documented inconsistently (sometimes top-level `symbols`,
// sometimes nested). Pull from whichever exists.
function extractSymbols(j: Record<string, unknown> | null): OutlookSymbol[] {
  if (!j) return [];
  if (Array.isArray(j.symbols)) return j.symbols as OutlookSymbol[];
  const outlook = j.outlook as { symbols?: unknown } | undefined;
  if (Array.isArray(outlook?.symbols)) return outlook!.symbols as OutlookSymbol[];
  const community = j.communityOutlook as { symbols?: unknown } | undefined;
  if (Array.isArray(community?.symbols)) return community!.symbols as OutlookSymbol[];
  return [];
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

  let lastLogin: LoginInfo | null = null;
  let lastOutlook: Fetched | null = null;
  let attempts = 0;
  let cookieForwarded = false;

  try {
    // Fresh login -> outlook, back-to-back, every attempt. No cross-invocation
    // token reuse: that reused a token from a different egress IP and is exactly
    // what produced "Invalid session".
    for (attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
      lastLogin = await login(email, password);
      if (!lastLogin.session) break; // login itself failed -> report, no point retrying

      cookieForwarded = !!lastLogin.cookies;
      const url = `${API}/get-community-outlook.json?session=${encodeURIComponent(lastLogin.session)}`;
      lastOutlook = await getJson(url, lastLogin.cookies);

      if (lastOutlook.json && !lastOutlook.json.error) {
        // ── success ──
        const x = extractSymbols(lastOutlook.json).find((s) => String(s.name ?? '').toUpperCase() === 'XAUUSD');
        if (!x) {
          res.status(404).json({ ok: false, reason: 'empty', message: 'XAUUSD not found in the community outlook.' });
          return;
        }
        const num = (v: unknown): number | null =>
          v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v);
        res.setHeader('Cache-Control', 's-maxage=55, stale-while-revalidate=120');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
          ok: true,
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
        });
        return;
      }
      // else: token rejected ("Invalid session") -> loop and log in fresh again
    }

    // TEMP DIAGNOSTIC: all attempts exhausted or login failed.
    const loginFailed = !lastLogin?.session;
    res.status(502).json({
      ok: false,
      reason: loginFailed ? 'login-failed' : 'error',
      message: loginFailed
        ? (lastLogin?.message || 'Myfxbook login failed.')
        : (typeof lastOutlook?.json?.message === 'string' ? lastOutlook.json.message : 'Myfxbook outlook error.'),
      debug: {
        stage: loginFailed ? 'login' : 'outlook',
        attempts,
        cookieForwarded,
        loginStatus: lastLogin?.status ?? null,
        loginError: lastLogin?.error ?? null,
        loginMessage: lastLogin?.message ?? null,
        loginSession: maskSession(lastLogin?.session ?? null),
        loginCookie: lastLogin?.cookies ? 'present' : 'none',
        loginRawSnippet: lastLogin?.session === null ? lastLogin?.rawSnippet : undefined,
        outlookStatus: lastOutlook?.status ?? null,
        outlookError: lastOutlook?.json?.error ?? (lastOutlook && !lastOutlook.json ? '(unparseable body)' : null),
        outlookMessage: lastOutlook?.json?.message ?? null,
        outlookRawSnippet: lastOutlook && !lastOutlook.json ? lastOutlook.rawSnippet : undefined,
        emailLen: email.length,
        passwordLen: password.length,
      },
    });
  } catch (e) {
    res.status(502).json({
      ok: false,
      reason: 'error',
      message: e instanceof Error ? e.message : 'fetch failed',
      debug: {
        stage: 'exception',
        attempts,
        cookieForwarded,
        loginStatus: lastLogin?.status ?? null,
        loginMessage: lastLogin?.message ?? null,
        loginSession: maskSession(lastLogin?.session ?? null),
        emailLen: email.length,
        passwordLen: password.length,
      },
    });
  }
}
