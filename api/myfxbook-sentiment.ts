// Vercel Serverless Function — Myfxbook Community Outlook (retail sentiment).
//
// Logs in to Myfxbook with email+password (server-side only), reuses the
// session token across warm invocations, fetches the community outlook and
// returns ONLY the XAUUSD long/short figures to the browser. Credentials and
// the session token never reach the client.
//
// Set in Vercel -> Settings -> Environment Variables (NO VITE_ prefix, so they
// stay server-only): MYFXBOOK_EMAIL, MYFXBOOK_PASSWORD. Redeploy after adding.
//
// ⚠️ TEMP DIAGNOSTIC MODE: on any failure this returns a `debug` object with the
// raw login/outlook response (status, error flag, message, masked session) so we
// can tell login failures apart from session-rejection. Remove the `debug`
// surfacing once the feed works (search for "TEMP DIAGNOSTIC").

import type { VercelRequest, VercelResponse } from '@vercel/node';

const API = 'https://www.myfxbook.com/api';

let cachedSession: string | null = null;

interface Fetched {
  status: number;
  json: Record<string, unknown> | null;
  rawSnippet: string; // first 300 chars, for when the body isn't JSON (e.g. HTML)
}

async function getJson(url: string): Promise<Fetched> {
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* not JSON */ }
  return { status: res.status, json, rawSnippet: text.slice(0, 300) };
}

// Mask a token so we can confirm one came back without leaking it.
function maskSession(s: string | null): string {
  if (!s) return '(none)';
  if (s.length <= 6) return `len=${s.length}`;
  return `${s.slice(0, 3)}…${s.slice(-2)} (len=${s.length})`;
}

interface LoginInfo {
  session: string | null;
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

  // TEMP DIAGNOSTIC: keep the last login result around so we can report it even
  // when the failure surfaces on the outlook call. Held on an object so the
  // closure assignment in loginFresh() doesn't get narrowed away by TS.
  const diag: { login: LoginInfo | null } = { login: null };

  async function loginFresh(): Promise<string> {
    diag.login = await login(email!, password!);
    cachedSession = diag.login.session;
    if (!cachedSession) throw new Error('no-session');
    return cachedSession;
  }

  try {
    if (!cachedSession) await loginFresh();
    let out = await getJson(`${API}/get-community-outlook.json?session=${encodeURIComponent(cachedSession!)}`);

    // Session stale / IP changed -> re-login once and retry.
    if (!out.json || out.json.error) {
      await loginFresh();
      out = await getJson(`${API}/get-community-outlook.json?session=${encodeURIComponent(cachedSession!)}`);
    }

    if (!out.json || out.json.error) {
      // TEMP DIAGNOSTIC payload
      res.status(502).json({
        ok: false,
        reason: 'error',
        message: typeof out.json?.message === 'string' ? out.json.message : 'Myfxbook outlook error.',
        debug: {
          stage: 'outlook',
          outlookStatus: out.status,
          outlookError: out.json?.error ?? '(unparseable body)',
          outlookMessage: out.json?.message ?? null,
          outlookRawSnippet: out.json ? undefined : out.rawSnippet,
          loginStatus: diag.login?.status ?? null,
          loginError: diag.login?.error ?? null,
          loginMessage: diag.login?.message ?? null,
          loginSession: maskSession(diag.login?.session ?? cachedSession),
          loginRawSnippet: diag.login && diag.login.session === null ? diag.login.rawSnippet : undefined,
          emailLen: email!.length,
          passwordLen: password!.length,
        },
      });
      return;
    }

    const x = extractSymbols(out.json).find((s) => String(s.name ?? '').toUpperCase() === 'XAUUSD');
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

    res.setHeader('Cache-Control', 's-maxage=55, stale-while-revalidate=120');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(payload);
  } catch (e) {
    cachedSession = null; // force a fresh login next request
    // TEMP DIAGNOSTIC payload — surfaces the raw login response so we can tell
    // a credentials/2FA failure apart from a session-rejection.
    res.status(502).json({
      ok: false,
      reason: diag.login && diag.login.session === null ? 'login-failed' : 'error',
      message: diag.login?.message || (e instanceof Error ? e.message : 'fetch failed'),
      debug: {
        stage: 'login',
        loginStatus: diag.login?.status ?? null,
        loginError: diag.login?.error ?? null,
        loginMessage: diag.login?.message ?? null,
        loginSession: maskSession(diag.login?.session ?? null),
        loginRawSnippet: diag.login?.session === null ? diag.login?.rawSnippet : undefined,
        emailLen: email!.length,
        passwordLen: password!.length,
      },
    });
  }
}
