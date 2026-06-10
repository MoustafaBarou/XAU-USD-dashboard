import { useEffect, useState } from 'react';
import { SESSIONS, sessionStatus, sessionCountdown, type SessionStatus } from '../data/sessions';

const COLORS: Record<SessionStatus, string> = {
  Open: '#4ADE80', Closed: '#8A93A6', Premarket: '#FFC857', 'After Hours': '#4CC9F0',
};
const LABEL: Record<SessionStatus, string> = {
  Open: 'OPEN', Closed: 'CLOSED', Premarket: 'PRE MARKET', 'After Hours': 'AFTER HOURS',
};

function clock(d: Date, utc: boolean) {
  const h = (utc ? d.getUTCHours() : d.getHours()).toString().padStart(2, '0');
  const m = (utc ? d.getUTCMinutes() : d.getMinutes()).toString().padStart(2, '0');
  const s = (utc ? d.getUTCSeconds() : d.getSeconds()).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function SessionRail() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  return (
    <div className="card px-5 py-3 flex flex-wrap items-center gap-x-8 gap-y-3">
      {SESSIONS.map((s) => {
        const st = sessionStatus(s, now);
        const c = COLORS[st];
        const cd = sessionCountdown(s, now);
        return (
          <div key={s.name} className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: st === 'Open' ? `0 0 8px ${c}` : 'none' }} />
            <span className="font-sora text-[12px] font-700 tracking-wide text-txt uppercase">{s.name}</span>
            <span className="text-[10px] font-700 tracking-wide" style={{ color: c }}>{LABEL[st]}</span>
            <span className="text-[11px] text-muted">{cd.label} {cd.text}</span>
          </div>
        );
      })}
      <div className="ml-auto flex items-center gap-3">
        <span className="card px-3 py-1.5 text-[11px] tnum text-greenSoft tracking-wide">{clock(now, false)} <span className="text-muted/70">LOCAL</span></span>
        <span className="card px-3 py-1.5 text-[11px] tnum text-greenSoft tracking-wide">{clock(now, true)} <span className="text-muted/70">UTC</span></span>
      </div>
    </div>
  );
}
