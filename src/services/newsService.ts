// ── Live news service ─────────────────────────────────────────────────────
// Real macro / gold news from free, browser-callable APIs. No mock data.
//
// Primary: Marketaux  (https://www.marketaux.com) — has sentiment + entity tags.
// Fallback: Finnhub   (https://finnhub.io) — general market news.
//
// Both are free, CORS-enabled and called directly from the browser, so they
// work on GitHub Pages without a backend. Keys come from Vite env vars; if no
// key is present the service reports that state and returns no items (it never
// fabricates news).

export type GoldSentiment = 'Bullish Gold' | 'Bearish Gold' | 'Neutral';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;      // ISO
  /** raw provider sentiment, -1..1 (may be undefined) */
  rawSentiment?: number;
  /** derived impact on gold */
  sentiment: GoldSentiment;
  /** 0-100 relevance/impact heuristic */
  impactScore: number;
  /** short AI-style reason for the gold impact */
  reason: string;
  snippet?: string;
}

export type NewsResult =
  | { ok: true; items: NewsItem[]; provider: string }
  | { ok: false; reason: 'no-key' | 'error' | 'empty'; message: string };

const MARKETAUX_KEY = import.meta.env.VITE_MARKETAUX_API_KEY as string | undefined;
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;
const NEWSAPI_KEY = import.meta.env.VITE_NEWS_API_KEY as string | undefined;
const FMP_KEY = import.meta.env.VITE_FMP_API_KEY as string | undefined;

// Gold / macro topics we care about
const TOPICS = [
  'gold', 'XAUUSD', 'Federal Reserve', 'USD', 'CPI', 'inflation',
  'NFP', 'FOMC', 'interest rates', 'Treasury yields',
];
const TOPIC_RE = new RegExp(`\\b(${[
  'gold', 'xau', 'bullion', 'federal reserve', 'fed', 'powell', 'usd', 'dollar',
  'cpi', 'inflation', 'nfp', 'payroll', 'fomc', 'rate', 'rates', 'treasury',
  'yield', 'yields', 'jobs', 'pce', 'recession', 'safe haven', 'central bank',
].join('|')})\\b`, 'i');

// ── Gold-impact heuristic (transparent, rule-based) ──────────────────────
// Maps headline cues + provider sentiment to a gold bias with a short reason.
function deriveGoldImpact(title: string, snippet: string, raw?: number): { sentiment: GoldSentiment; reason: string; impact: number } {
  const t = `${title} ${snippet}`.toLowerCase();

  const bullishCues = [
    ['rate cut', 'Rate-cut expectations lower real yields — supportive for gold.'],
    ['cuts rates', 'Lower rates reduce the carry cost of holding gold.'],
    ['dovish', 'Dovish policy tone weakens the dollar and supports gold.'],
    ['weak dollar', 'A weaker dollar lifts dollar-priced gold.'],
    ['dollar falls', 'Falling dollar is supportive for gold.'],
    ['safe haven', 'Safe-haven demand tends to lift gold.'],
    ['geopolitical', 'Geopolitical risk raises safe-haven demand for gold.'],
    ['war', 'Conflict-driven risk-off flows favour gold.'],
    ['recession', 'Recession fears typically increase gold demand.'],
    ['central bank buying', 'Official-sector buying is a structural tailwind for gold.'],
    ['inflation rises', 'Rising inflation supports gold as a store of value.'],
    ['inflation jumps', 'Hotter inflation can lift gold as an inflation hedge.'],
  ] as const;

  const bearishCues = [
    ['rate hike', 'Rate hikes raise real yields — a headwind for gold.'],
    ['hikes rates', 'Higher rates increase the opportunity cost of gold.'],
    ['hawkish', 'Hawkish policy tone strengthens the dollar, pressuring gold.'],
    ['strong dollar', 'A stronger dollar weighs on dollar-priced gold.'],
    ['dollar rises', 'Rising dollar is a headwind for gold.'],
    ['dollar surges', 'A surging dollar pressures gold.'],
    ['yields rise', 'Rising Treasury yields lift the carry cost of gold.'],
    ['yields surge', 'Surging yields are bearish for non-yielding gold.'],
    ['risk-on', 'Risk-on sentiment draws flows away from gold.'],
    ['strong jobs', 'Strong jobs data supports the dollar, pressuring gold.'],
    ['hot jobs', 'A hot labour market can delay cuts — bearish for gold.'],
  ] as const;

  for (const [cue, reason] of bullishCues) {
    if (t.includes(cue)) return { sentiment: 'Bullish Gold', reason, impact: 78 };
  }
  for (const [cue, reason] of bearishCues) {
    if (t.includes(cue)) return { sentiment: 'Bearish Gold', reason, impact: 78 };
  }

  // fall back to provider sentiment if present
  if (typeof raw === 'number') {
    // For broad macro/dollar news, positive market sentiment often = risk-on = bearish gold.
    if (raw > 0.15) return { sentiment: 'Bearish Gold', reason: 'Positive market sentiment leans risk-on, a mild headwind for gold.', impact: 55 };
    if (raw < -0.15) return { sentiment: 'Bullish Gold', reason: 'Negative market sentiment leans risk-off, mildly supportive for gold.', impact: 55 };
  }
  return { sentiment: 'Neutral', reason: 'No clear directional driver for gold in this headline.', impact: 40 };
}

function relevance(title: string, snippet: string): number {
  const text = `${title} ${snippet}`;
  let score = 30;
  if (/\b(gold|xau|bullion)\b/i.test(text)) score += 35;
  if (/\b(fed|fomc|powell|federal reserve)\b/i.test(text)) score += 15;
  if (/\b(cpi|inflation|pce|nfp|payroll|rate|yield)\b/i.test(text)) score += 12;
  if (/\b(dollar|usd|treasury)\b/i.test(text)) score += 8;
  return Math.min(100, score);
}

// ── Providers ────────────────────────────────────────────────────────────

async function fetchMarketaux(): Promise<NewsItem[]> {
  const url = new URL('https://api.marketaux.com/v1/news/all');
  url.searchParams.set('api_token', MARKETAUX_KEY!);
  url.searchParams.set('language', 'en');
  url.searchParams.set('filter_entities', 'true');
  url.searchParams.set('search', 'gold OR inflation OR "Federal Reserve" OR yields OR dollar');
  url.searchParams.set('limit', '20');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Marketaux HTTP ${res.status}`);
  const data = await res.json();
  const arr: any[] = Array.isArray(data?.data) ? data.data : [];
  return arr.map((a, i) => {
    const title = a.title ?? '';
    const snippet = a.description ?? a.snippet ?? '';
    const raw = typeof a.entities?.[0]?.sentiment_score === 'number'
      ? a.entities[0].sentiment_score
      : (typeof a.sentiment === 'number' ? a.sentiment : undefined);
    const impact = deriveGoldImpact(title, snippet, raw);
    return {
      id: a.uuid ?? `mx-${i}`,
      title,
      source: a.source ?? 'Marketaux',
      url: a.url ?? '#',
      publishedAt: a.published_at ?? new Date().toISOString(),
      rawSentiment: raw,
      sentiment: impact.sentiment,
      impactScore: Math.max(impact.impact, relevance(title, snippet)),
      reason: impact.reason,
      snippet,
    } as NewsItem;
  });
}

async function fetchFinnhub(): Promise<NewsItem[]> {
  const url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  const arr: any[] = await res.json();
  return arr
    .filter((a) => TOPIC_RE.test(`${a.headline} ${a.summary}`))
    .slice(0, 20)
    .map((a, i) => {
      const title = a.headline ?? '';
      const snippet = a.summary ?? '';
      const impact = deriveGoldImpact(title, snippet);
      return {
        id: String(a.id ?? `fh-${i}`),
        title,
        source: a.source ?? 'Finnhub',
        url: a.url ?? '#',
        publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : new Date().toISOString(),
        sentiment: impact.sentiment,
        impactScore: Math.max(impact.impact, relevance(title, snippet)),
        reason: impact.reason,
        snippet,
      } as NewsItem;
    });
}

async function fetchNewsApi(): Promise<NewsItem[]> {
  // NewsAPI.org blocks browser requests on its free tier (CORS), so this is a
  // best-effort last resort; it will usually fail from GitHub Pages.
  const q = encodeURIComponent('gold OR XAUUSD OR "Federal Reserve" OR inflation OR FOMC');
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWSAPI_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
  const data = await res.json();
  const arr: any[] = Array.isArray(data?.articles) ? data.articles : [];
  return arr.map((a, i) => {
    const title = a.title ?? '';
    const snippet = a.description ?? '';
    const impact = deriveGoldImpact(title, snippet);
    return {
      id: a.url ?? `na-${i}`,
      title,
      source: a.source?.name ?? 'NewsAPI',
      url: a.url ?? '#',
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      sentiment: impact.sentiment,
      impactScore: Math.max(impact.impact, relevance(title, snippet)),
      reason: impact.reason,
      snippet,
    } as NewsItem;
  });
}


async function fetchFmp(): Promise<NewsItem[]> {
  // FMP general + forex news, filtered to gold/macro topics.
  const url = `https://financialmodelingprep.com/api/v3/fmp/articles?page=0&size=50&apikey=${FMP_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FMP news HTTP ${res.status}`);
  const data = await res.json();
  const arr: any[] = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
  return arr
    .filter((a) => TOPIC_RE.test(`${a.title} ${a.text ?? a.content ?? ''}`))
    .slice(0, 20)
    .map((a, i) => {
      const title = a.title ?? '';
      const snippet = (a.text ?? a.content ?? '').replace(/<[^>]+>/g, '').slice(0, 200);
      const impact = deriveGoldImpact(title, snippet);
      return {
        id: a.url ?? `fmp-${i}`,
        title,
        source: a.site ?? a.publisher ?? 'FMP',
        url: a.url ?? '#',
        publishedAt: a.date ?? new Date().toISOString(),
        sentiment: impact.sentiment,
        impactScore: Math.max(impact.impact, relevance(title, snippet)),
        reason: impact.reason,
        snippet,
      } as NewsItem;
    });
}

/** Fetch the freshest gold/macro news from the first available provider. */
export async function fetchGoldNews(): Promise<NewsResult> {
  const providers: { name: string; key?: string; fn: () => Promise<NewsItem[]> }[] = [
    { name: 'Marketaux', key: MARKETAUX_KEY, fn: fetchMarketaux },
    { name: 'FMP', key: FMP_KEY, fn: fetchFmp },
    { name: 'Finnhub', key: FINNHUB_KEY, fn: fetchFinnhub },
    { name: 'NewsAPI', key: NEWSAPI_KEY, fn: fetchNewsApi },
  ];
  const configured = providers.filter((p) => !!p.key);

  if (configured.length === 0) {
    return {
      ok: false, reason: 'no-key',
      message: 'No news API key configured. Add VITE_MARKETAUX_API_KEY or VITE_FINNHUB_API_KEY to enable the live feed.',
    };
  }

  let lastErr = '';
  for (const p of configured) {
    try {
      const items = await p.fn();
      if (items.length > 0) {
        items.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
        return { ok: true, items, provider: p.name };
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, reason: lastErr ? 'error' : 'empty', message: lastErr || 'No matching gold/macro news right now.' };
}

export const NEWS_TOPICS = TOPICS;
export const POLL_INTERVAL_MS = 60_000;
