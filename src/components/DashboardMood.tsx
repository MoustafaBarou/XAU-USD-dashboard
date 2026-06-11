import { useMemo } from 'react';
import { useEconomicCalendar, nextHighImpact } from '../hooks/useEconomicCalendar';
import { computeMarketMood, moodColor, moodLabel } from '../lib/marketMood';
import { EventCountdown } from './EventCountdown';
import { fmtAmsTime, amsZoneLabel } from '../lib/time';

export function DashboardMood() {
  const cal = useEconomicCalendar();

  const { mood, nextHi } = useMemo(() => {
    if (cal.status !== 'ok') return { mood: null, nextHi: null };
    return { mood: computeMarketMood(cal.events), nextHi: nextHighImpact(cal.events) };
  }, [cal]);

  if (cal.status === 'loading') {
    return <div className="card p-5 text-[12px] text-muted">Loading market bias...</div>;
  }
  if (cal.status === 'error') {
    return <div className="card p-5 text-[12px] text-muted">Market bias unavailable (calendar feed not reachable).</div>;
  }
  if (!mood) return null;

  const color = moodColor(mood.score);
  const marker = mood.score >= 60 ? '🟢' : mood.score <= 39 ? '🔴' : '🟡';
  const confidence = Math.min(100, Math.round(Math.abs(mood.score - 50) * 2));

  const fmtTime = (iso: string) => fmtAmsTime(iso);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* TODAY'S MARKET BIAS */}
      <div className="surface surface-lit p-5">
        <div className="eyebrow mb-3">Today's Market Bias</div>
        <div className="flex items-center gap-3">
          <span className="text-[22px]">{marker}</span>
          <span className="font-sora font-800 text-[24px] tracking-wide" style={{ color }}>{moodLabel(mood.score)}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Confidence</div>
            <div className="font-sora font-700 text-[18px] tnum" style={{ color }}>{confidence}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Next Risk Event</div>
            <div className="font-sora font-700 text-[15px] text-txt truncate">{nextHi ? `${nextHi.currency} ${nextHi.event}` : '-'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Impact</div>
            <div className="font-sora font-700 text-[15px]" style={{ color: nextHi ? '#FF4D6D' : '#8A93A6' }}>{nextHi ? 'High' : '-'}</div>
          </div>
        </div>
      </div>

      {/* NEXT HIGH IMPACT EVENT */}
      <div className="surface surface-lit p-5">
        <div className="eyebrow mb-3">Next High Impact Event</div>
        {nextHi ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="text-[18px]">🔴</span>
              <span className="font-sora font-800 text-[18px] text-txt">{nextHi.currency} {nextHi.event}</span>
            </div>
            <div className="text-[12px] text-muted mt-1 tnum">{fmtTime(nextHi.date)} {amsZoneLabel(nextHi.date)}</div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Starts in</div>
              <EventCountdown target={nextHi.date} className="font-sora font-800 text-[28px] text-gold" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Expected</div>
                <div className="font-sora font-700 text-[15px] text-txt2 tnum">{nextHi.estimate ?? '-'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Previous</div>
                <div className="font-sora font-700 text-[15px] text-txt2 tnum">{nextHi.previous ?? '-'}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-[12px] text-muted/70 py-6 text-center">No upcoming high-impact events in the next 7 days.</div>
        )}
      </div>
    </div>
  );
}
