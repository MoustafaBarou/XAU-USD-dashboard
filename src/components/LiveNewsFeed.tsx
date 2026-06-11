import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  fetchGoldNews, POLL_INTERVAL_MS,
  type NewsItem, type NewsResult, type GoldSentiment,
} from '../services/newsService';
import { Eyebrow } from './ui';

function sentColor(s: GoldSentiment) {
  return s === 'Bullish Gold' ? '#4ADE80' : s === 'Bearish Gold' ? '#FF4D6D' : '#FFC857';
}
function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function LiveNewsFeed() {
  const [result, setResult] = useState<NewsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  async function load(initial = false) {
    if (initial) setLoading(true);
    const r = await fetchGoldNews();
    setResult(r);
    setLoading(false);
    if (r.ok) setLastUpdated(Date.now());
  }

  useEffect(() => {
    load(true);
    timer.current = window.setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => { if (timer.current !== null) clearInterval(timer.current); };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-greenBright">📡</span>
          <h3 className="font-sora font-700 text-[15px] text-txt tracking-wide">Live Gold &amp; Macro News</h3>
        </div>
        <div className="flex items-center gap-3">
          {result?.ok && (
            <span className="flex items-center gap-1.5 text-[11px] text-greenSoft">
              <span className="h-1.5 w-1.5 rounded-full bg-greenBright animate-pulse" style={{ boxShadow: '0 0 7px #4ADE80' }} />
              {result.provider} · live
            </span>
          )}
          <Eyebrow>Refresh 60s</Eyebrow>
        </div>
      </div>

      {/* loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 w-1/3 bg-white/8 rounded mb-3" />
              <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
              <div className="h-3 w-1/2 bg-white/8 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* error / no-key states (no fabricated data) */}
      {!loading && result && !result.ok && (
        <div className="card p-6 border border-white/[0.06]">
          {result.reason === 'no-key' ? (
            <>
              <div className="font-sora font-700 text-[15px] text-warn mb-2">News feed not yet connected</div>
              <p className="text-[13px] text-txt2/85 leading-relaxed mb-3">{result.message}</p>
              <p className="text-[12px] text-muted leading-relaxed">
                Get a free key at <span className="text-greenSoft">marketaux.com</span> or <span className="text-greenSoft">finnhub.io</span>,
                then add it to a <code className="text-greenSoft">.env</code> file and rebuild. No data is shown until a real source is connected.
              </p>
            </>
          ) : (
            <>
              <div className="font-sora font-700 text-[15px] text-bear mb-2">Couldn’t load news</div>
              <p className="text-[13px] text-txt2/85 leading-relaxed">{result.message}</p>
              <button onClick={() => load(true)}
                className="mt-4 card card-hover px-4 py-2 text-[12px] font-600 text-txt2 transition-colors">
                Retry now
              </button>
            </>
          )}
        </div>
      )}

      {/* live items */}
      {!loading && result?.ok && (
        <>
          <div className="space-y-3">
            {result.items.map((n: NewsItem, i) => {
              const c = sentColor(n.sentiment);
              return (
                <motion.a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="card card-hover p-4 block transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-greenSoft/80">{n.source}</span>
                    <span className="text-[10px] tnum text-muted">{timeAgo(n.publishedAt)}</span>
                  </div>
                  <div className="font-sora font-600 text-[14px] text-txt leading-snug mb-2">{n.title}</div>

                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-[10px] font-700 px-2.5 py-[3px] rounded-full uppercase tracking-wide"
                      style={{ color: c, background: `${c}1a`, border: `1px solid ${c}40` }}>{n.sentiment}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted">Impact</span>
                      <div className="h-1 w-16 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${n.impactScore}%`, background: 'linear-gradient(90deg,#15803D,#4ADE80)' }} />
                      </div>
                      <span className="text-[10px] tnum text-muted">{n.impactScore}</span>
                    </span>
                  </div>

                  {/* AI impact analysis */}
                  <div className="rounded-lg p-2.5" style={{ background: `${c}0d`, border: `1px solid ${c}26` }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span style={{ color: c }} className="text-[11px]">✦</span>
                      <span className="text-[9px] uppercase tracking-[0.14em] font-700" style={{ color: c }}>Expected Impact On Gold</span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-txt2/85">{n.reason}</p>
                  </div>
                </motion.a>
              );
            })}
          </div>
          {lastUpdated && (
            <div className="text-[10px] text-muted/60 mt-4 text-center">
              Last updated {timeAgo(new Date(lastUpdated).toISOString())} · auto-refreshing every 60s · impact analysis is a transparent rule-based heuristic, not financial advice.
            </div>
          )}
        </>
      )}
    </div>
  );
}
