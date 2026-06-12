import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from './PageShell';
import { Surface, Eyebrow } from '../components/ui';
import { SESSIONS, sessionStatus, type SessionDef, type SessionStatus } from '../data/sessions';
import { useEconomicCalendar, type CalEvent, type Impact } from '../hooks/useEconomicCalendar';
import { fmtAmsTime, amsZoneLabel, amsHoursOfDay, amsUtcOffsetHours, amsDateKey } from '../lib/time';

// ── Palette (consistent with SessionRail + EconomicCalendar) ───────────────
const SESSION_COLOR: Record<string, string> = {
  Sydney: '#4CC9F0', Tokyo: '#B47CFF', London: '#4ADE80', 'New York': '#FFC857',
};
const STATUS_COLOR: Record<SessionStatus, string> = {
  Open: '#4ADE80', Closed: '#8A93A6', Premarket: '#FFC857', 'After Hours': '#4CC9F0',
};
const STATUS_LABEL: Record<SessionStatus, string> = {
  Open: 'OPEN', Closed: 'CLOSED', Premarket: 'PRE MARKET', 'After Hours': 'AFTER HOURS',
};
const IMPACT_COLOR: Record<Impact, string> = {
  High: '#FF4D6D', Medium: '#FFC857', Low: '#FFE66D', None: '#8A93A6',
};

// A session can wrap past midnight (e.g. Sydney). Split into bar segments
// expressed as [startHour, endHour] in 0–24 space (already Amsterdam-local).
function sessionSegments(open: number, close: number): [number, number][] {
  if (open < close) return [[open, close]];
  return [[open, 24], [0, close]];
}

const pct = (hours: number) => (hours / 24) * 100;

// ── Live UTC + local clock ─────────────────────────────────────────────────
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function pad(n: number) { return n.toString().padStart(2, '0'); }
const mod24 = (h: number) => ((h % 24) + 24) % 24;
function utcClock(d: Date) { return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; }
function amsClock(d: Date) {
  return d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Amsterdam', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

export function CalendarPage() {
  const now = useNow();
  const cal = useEconomicCalendar();
  const [hovered, setHovered] = useState<string | null>(null);

  // Live "now" position on the bar, in Amsterdam wall-clock hours.
  const nowH = amsHoursOfDay(now);

  // Sessions are defined in UTC hours-of-day; shift them into Amsterdam local
  // hours using the current DST-correct offset (CET +1 / CEST +2).
  const sessions = useMemo(() => {
    const off = amsUtcOffsetHours(now);
    return SESSIONS.map((s) => ({
      def: s,
      status: sessionStatus(s, now),
      openAms: mod24(s.openUtc + off),
      closeAms: mod24(s.closeUtc + off),
    }));
  }, [now]);

  // Events occurring on *today's Amsterdam calendar day* — only these map onto
  // the 24h bar. We never fabricate; if the feed is down or empty we say so.
  const todayEvents = useMemo(() => {
    if (cal.status !== 'ok') return [];
    const todayKey = amsDateKey(now);
    return cal.events
      .filter((e) => e.date && amsDateKey(new Date(e.date)) === todayKey)
      .filter((e) => e.impact === 'High' || e.impact === 'Medium')
      .map((e) => ({ ev: e, hours: amsHoursOfDay(new Date(e.date)) }))
      .sort((a, b) => a.hours - b.hours);
  }, [cal, now]);

  return (
    <div className="pb-10">
      <PageHeader
        title="Calendar"
        description="Market sessions and gold-relevant events on one timeline anchored to Amsterdam time, with the live clock and a UTC reference."
      />

      {/* Live clocks — Amsterdam is the primary reference, UTC secondary. */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="card px-3.5 py-1.5 text-[12px] tnum font-700 text-greenSoft tracking-wide">
          {amsClock(now)} <span className="text-muted/70 font-400">AMSTERDAM · {amsZoneLabel()}</span>
        </span>
        <span className="card px-3.5 py-1.5 text-[12px] tnum font-700 text-txt2 tracking-wide">
          {utcClock(now)} <span className="text-muted/70 font-400">UTC</span>
        </span>
      </div>

      {/* ── SESSION TIMELINE ─────────────────────────────────────────────── */}
      <Surface className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Eyebrow>Session Timeline · 24H · Europe/Amsterdam</Eyebrow>
          <div className="flex items-center gap-4 flex-wrap">
            {sessions.map(({ def }) => (
              <span key={def.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: SESSION_COLOR[def.name] }} />
                <span className="font-sora font-700 text-txt2 tracking-wide">{def.name}</span>
              </span>
            ))}
          </div>
        </div>

        <SessionBar
          sessions={sessions}
          events={todayEvents}
          nowH={nowH}
          hovered={hovered}
          setHovered={setHovered}
        />

        {/* Per-session status row — open/close shown in Amsterdam time. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
          {sessions.map(({ def, status, openAms, closeAms }) => {
            const c = STATUS_COLOR[status];
            return (
              <div key={def.name} className="card px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-sora font-700 text-[12px] tracking-wide text-txt uppercase">{def.name}</span>
                  <span className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: status === 'Open' ? `0 0 8px ${c}` : 'none' }} />
                </div>
                <div className="text-[10px] font-700 tracking-wide mt-1.5" style={{ color: c }}>{STATUS_LABEL[status]}</div>
                <div className="text-[11px] text-muted mt-1 tnum">
                  {pad(openAms)}:00 – {pad(closeAms)}:00 <span className="text-muted/60">{amsZoneLabel()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      {/* ── EVENT OVERLAY (feed states + list) ───────────────────────────── */}
      <Surface className="p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <Eyebrow>Event Overlay · Today</Eyebrow>
          <span className="text-[11px] text-muted">High &amp; Medium impact · gold-relevant · JBlanked feed</span>
        </div>

        {cal.status === 'loading' && (
          <div className="text-[13px] text-muted py-4">Loading events…</div>
        )}
        {cal.status === 'error' && (
          <div className="text-[13px] text-bear py-4">Calendar feed unavailable — {cal.message}</div>
        )}
        {cal.status === 'ok' && todayEvents.length === 0 && (
          <div className="text-[13px] text-muted py-4">No high/medium-impact events scheduled today.</div>
        )}
        {cal.status === 'ok' && todayEvents.length > 0 && (
          <div className="space-y-1.5">
            {todayEvents.map(({ ev }) => (
              <EventRow
                key={ev.id}
                ev={ev}
                active={hovered === ev.id}
                onHover={() => setHovered(ev.id)}
                onLeave={() => setHovered(null)}
              />
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}

// ── The 24h bar with session blocks, hour ticks, now-line and event markers ─
function SessionBar({
  sessions, events, nowH, hovered, setHovered,
}: {
  sessions: { def: SessionDef; status: SessionStatus; openAms: number; closeAms: number }[];
  events: { ev: CalEvent; hours: number }[];
  nowH: number;
  hovered: string | null;
  setHovered: (id: string | null) => void;
}) {
  return (
    <div className="relative">
      {/* track */}
      <div className="relative h-16 rounded-xl bg-black/30 border border-white/[0.06] overflow-hidden">
        {/* hour gridlines */}
        {HOUR_TICKS.slice(1, -1).map((h) => (
          <div key={h} className="absolute top-0 bottom-0 w-px bg-white/[0.05]" style={{ left: `${pct(h)}%` }} />
        ))}
        {/* session blocks */}
        {sessions.map(({ def, openAms, closeAms }) =>
          sessionSegments(openAms, closeAms).map(([a, b], i) => (
            <div
              key={`${def.name}-${i}`}
              className="absolute top-2 bottom-2 rounded-md flex items-center justify-center"
              style={{
                left: `${pct(a)}%`,
                width: `${pct(b - a)}%`,
                background: `${SESSION_COLOR[def.name]}22`,
                border: `1px solid ${SESSION_COLOR[def.name]}55`,
              }}
            >
              <span className="font-sora font-700 text-[10px] tracking-wide truncate px-1" style={{ color: SESSION_COLOR[def.name] }}>
                {def.name}
              </span>
            </div>
          )),
        )}
        {/* live now indicator */}
        <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${pct(nowH)}%` }}>
          <div className="absolute top-0 bottom-0 w-[2px] bg-gold" style={{ boxShadow: '0 0 10px #E6C65B' }} />
          <div className="absolute -top-[3px] -translate-x-1/2 h-2 w-2 rounded-full bg-gold" style={{ boxShadow: '0 0 8px #E6C65B' }} />
        </div>
        {/* event markers */}
        {events.map(({ ev, hours }) => {
          const c = IMPACT_COLOR[ev.impact];
          const active = hovered === ev.id;
          return (
            <div
              key={ev.id}
              className="absolute z-30 -translate-x-1/2 cursor-pointer"
              style={{ left: `${pct(hours)}%`, top: '50%', transform: 'translate(-50%,-50%)' }}
              onMouseEnter={() => setHovered(ev.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered(active ? null : ev.id)}
            >
              <span
                className={`block rounded-full transition-all ${active ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'}`}
                style={{ background: c, border: '1.5px solid #04060A', boxShadow: `0 0 8px ${c}` }}
              />
              {active && <EventTooltip ev={ev} pos={pct(hours)} />}
            </div>
          );
        })}
      </div>

      {/* hour labels */}
      <div className="relative h-5 mt-1.5">
        {HOUR_TICKS.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 text-[10px] tnum text-muted"
            style={{ left: `${pct(h)}%` }}
          >
            {pad(h === 24 ? 0 : h)}:00
          </span>
        ))}
      </div>
    </div>
  );
}

function EventTooltip({ ev, pos }: { ev: CalEvent; pos: number }) {
  const c = IMPACT_COLOR[ev.impact];
  const d = new Date(ev.date);
  const utc = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  // Keep the tooltip on-screen near the edges of the bar.
  const align = pos > 75 ? 'right-0' : pos < 25 ? 'left-0' : 'left-1/2 -translate-x-1/2';
  return (
    <div className={`absolute bottom-[calc(100%+10px)] ${align} z-40 w-56 surface surface-lit p-3.5 pointer-events-none`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-sora font-700 text-[10px] tracking-wide px-2 py-0.5 rounded-full"
          style={{ color: c, background: `${c}1a`, border: `1px solid ${c}40` }}>
          {ev.impact.toUpperCase()}
        </span>
        <span className="text-[11px] font-700 text-txt2 tracking-wide">{ev.currency}</span>
      </div>
      <div className="font-sora font-700 text-[13px] text-txt leading-snug">{ev.event}</div>
      <div className="text-[11px] text-muted mt-1.5 tnum">
        {fmtAmsTime(ev.date)} {amsZoneLabel(ev.date)} · <span className="text-muted/70">{utc}</span>
      </div>
    </div>
  );
}

function EventRow({ ev, active, onHover, onLeave }: {
  ev: CalEvent; active: boolean; onHover: () => void; onLeave: () => void;
}) {
  const c = IMPACT_COLOR[ev.impact];
  const d = new Date(ev.date);
  const utc = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`flex items-center gap-4 px-4 py-2.5 rounded-lg transition-colors cursor-default ${active ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}
    >
      <span className="tnum text-[12px] text-txt2 w-[132px] shrink-0">
        {fmtAmsTime(ev.date)} <span className="text-muted/60">{amsZoneLabel(ev.date)}</span> · {utc} <span className="text-muted/60">UTC</span>
      </span>
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
      <span className="font-sora font-600 text-[13px] text-txt flex-1 truncate">{ev.event}</span>
      <span className="text-[11px] font-700 text-txt2 tracking-wide shrink-0">{ev.currency}</span>
      <span className="text-[10px] font-700 tracking-wide px-2 py-0.5 rounded-full shrink-0"
        style={{ color: c, background: `${c}1a`, border: `1px solid ${c}40` }}>
        {ev.impact.toUpperCase()}
      </span>
    </div>
  );
}
