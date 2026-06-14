import { useMemo } from 'react';
import { PageHeader } from './PageShell';
import { useEconomicCalendar } from '../hooks/useEconomicCalendar';
import { computeMarketMood, moodColor, moodLabel } from '../lib/marketMood';
import { useRetailSentiment } from '../hooks/useRetailSentiment';
import { contrarianBias, contrarianLabel } from '../services/sentimentService';

export function MarketMoodPage() {
  const cal = useEconomicCalendar();

  const mood = useMemo(() => {
    if (cal.status !== 'ok') return null;
    return computeMarketMood(cal.events);
  }, [cal]);

  return (
    <div>
      <PageHeader
        title="Market Mood"
        description="Live gold sentiment · scored from the macro calendar · inflation, jobs, growth, rates"
      />
      <div className="rule my-8" />

      {cal.status === 'loading' && <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Computing market mood…</div>}
      {cal.status === 'error' && <div className="text-[11px] uppercase tracking-[0.14em] text-bear">Calendar unavailable · {cal.message}</div>}

      {cal.status === 'ok' && mood && (
        <div className="space-y-6">
          {/* Gauge + headline */}
          <div className="surface surface-lit p-6 md:p-8">
            <div className="grid md:grid-cols-[260px_1fr] gap-8 items-center">
              <Gauge score={mood.score} />
              <div>
                <div className="eyebrow mb-2">Market Mood</div>
                <div className="font-sora font-800 tnum leading-none" style={{ fontSize: 'clamp(40px,6vw,64px)', color: moodColor(mood.score) }}>
                  {mood.score}<span className="text-muted text-[24px] font-700"> / 100</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: `${moodColor(mood.score)}1a`, border: `1px solid ${moodColor(mood.score)}44` }}>
                  <span style={{ color: moodColor(mood.score) }}>{mood.score >= 60 ? '▲' : mood.score <= 39 ? '▼' : '●'}</span>
                  <span className="font-sora font-700 text-[13px] tracking-wide" style={{ color: moodColor(mood.score) }}>
                    {moodLabel(mood.score)}
                  </span>
                </div>
                {mood.topReason && <p className="text-[13px] text-txt2 mt-4 leading-relaxed max-w-lg">{mood.topReason}</p>}
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted/60 mt-2"><span className="tnum">{mood.sampleSize}</span> scored event{mood.sampleSize === 1 ? '' : 's'} · next 7D</p>
              </div>
            </div>
          </div>

          {/* Sentiment bar + percentages */}
          <div className="surface surface-lit p-6">
            <div className="eyebrow mb-4">Sentiment Balance</div>
            <SentimentBar bullish={mood.bullishPct} bearish={mood.bearishPct} />
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="card p-4 text-center">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Bullish</div>
                <div className="font-sora font-800 text-[24px] tnum" style={{ color: '#00D98B' }}>{mood.bullishPct}%</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Bearish</div>
                <div className="font-sora font-800 text-[24px] tnum" style={{ color: '#FF4D6D' }}>{mood.bearishPct}%</div>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted/55 mt-4 tnum">
              0–39 Bearish · 40–59 Neutral · 60–100 Bullish · computed from live calendar data
            </p>
          </div>
        </div>
      )}

      {/* Retail positioning — separate data source (Myfxbook community outlook). */}
      <div className="mt-6">
        <RetailSentimentSection />
      </div>
    </div>
  );
}

function RetailSentimentSection() {
  const s = useRetailSentiment();

  if (s.status === 'loading') {
    return (
      <div className="surface surface-lit p-6">
        <div className="eyebrow mb-4">Retail Sentiment · XAU/USD</div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Loading retail outlook…</div>
      </div>
    );
  }
  if (s.status === 'error') {
    const msg = s.reason === 'no-key' ? 'Sentiment feed not connected' : `Sentiment unavailable · ${s.message}`;
    return (
      <div className="surface surface-lit p-6">
        <div className="eyebrow mb-4">Retail Sentiment · XAU/USD</div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-bear">{msg}</div>
      </div>
    );
  }

  const d = s.data;
  const longPct = d.longPercentage ?? 0;
  const shortPct = d.shortPercentage ?? 0;
  const bias = contrarianBias(d.shortPercentage);
  const biasColor = bias === 'Bullish' ? '#00D98B' : bias === 'Bearish' ? '#FF4D6D' : '#FFC857';
  const biasGlyph = bias === 'Bullish' ? '▲' : bias === 'Bearish' ? '▼' : '●';
  const fmtNum = (v: number | null, dp = 0) => (v === null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }));

  return (
    <div className="surface surface-lit p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="eyebrow">Retail Sentiment · XAU/USD</div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-700 uppercase tracking-[0.12em]"
          style={{ color: biasColor, background: `${biasColor}1a`, border: `1px solid ${biasColor}40` }}>
          <span>{biasGlyph}</span>{bias === 'Neutral' ? 'No Edge' : `Contrarian ${bias}`}
        </span>
      </div>

      {/* short (red) vs long (green) split */}
      <div className="h-5 w-full rounded-full overflow-hidden flex bg-black/40 border border-white/10">
        <div style={{ width: `${shortPct}%`, background: 'linear-gradient(90deg,#FF4D6D,#FF6B82)' }} className="h-full transition-all" />
        <div style={{ width: `${longPct}%`, background: 'linear-gradient(90deg,#00B873,#00D98B)' }} className="h-full ml-auto transition-all" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="card p-4 text-center">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Short</div>
          <div className="font-sora font-800 text-[24px] tnum" style={{ color: '#FF4D6D' }}>{fmtNum(d.shortPercentage, 1)}%</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted/60 mt-1 tnum">{fmtNum(d.shortPositions)} pos · {fmtNum(d.shortVolume, 2)} lots</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Long</div>
          <div className="font-sora font-800 text-[24px] tnum" style={{ color: '#00D98B' }}>{fmtNum(d.longPercentage, 1)}%</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted/60 mt-1 tnum">{fmtNum(d.longPositions)} pos · {fmtNum(d.longVolume, 2)} lots</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Avg Short</div>
          <div className="font-sora font-700 text-[15px] text-txt2 tnum">{fmtNum(d.avgShortPrice, 2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Avg Long</div>
          <div className="font-sora font-700 text-[15px] text-txt2 tnum">{fmtNum(d.avgLongPrice, 2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Positions</div>
          <div className="font-sora font-700 text-[15px] text-txt2 tnum">{fmtNum(d.totalPositions)}</div>
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-[0.12em] text-muted/55 mt-4">
        {contrarianLabel(d.shortPercentage, d.longPercentage)} · live retail outlook · refresh 60s
      </p>
    </div>
  );
}

function Gauge({ score }: { score: number }) {
  const W = 240, H = 140, cx = W / 2, cy = H - 10, r = 100;
  const color = moodColor(score);
  const a = Math.PI * (1 - score / 100);
  const px = cx + r * Math.cos(a);
  const py = cy - r * Math.sin(a);
  const arc = (from: number, to: number) => {
    const a0 = Math.PI * (1 - from / 100), a1 = Math.PI * (1 - to / 100);
    const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: 260 }}>
      <path d={arc(0, 39)} fill="none" stroke="#FF4D6D" strokeWidth="14" strokeLinecap="round" opacity={0.85} />
      <path d={arc(40, 59)} fill="none" stroke="#FFC857" strokeWidth="14" strokeLinecap="round" opacity={0.85} />
      <path d={arc(60, 100)} fill="none" stroke="#00D98B" strokeWidth="14" strokeLinecap="round" opacity={0.85} />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill={color} />
    </svg>
  );
}

function SentimentBar({ bullish, bearish }: { bullish: number; bearish: number }) {
  return (
    <div className="h-5 w-full rounded-full overflow-hidden flex bg-black/40 border border-white/10">
      <div style={{ width: `${bearish}%`, background: 'linear-gradient(90deg,#FF4D6D,#FF6B82)' }} className="h-full transition-all" />
      <div style={{ width: `${bullish}%`, background: 'linear-gradient(90deg,#00B873,#00D98B)' }} className="h-full ml-auto transition-all" />
    </div>
  );
}
