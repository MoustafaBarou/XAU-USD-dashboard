import { useEffect, useState } from 'react';
import { SESSIONS, sessionStatus, type SessionStatus } from '../data/sessions';

const COLORS: Record<SessionStatus, string> = {
  Open: '#00D98B', Closed: '#8A93A6', Premarket: '#FFC857', 'After Hours': '#4CC9F0',
};

export function Sessions() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
      {SESSIONS.map((s) => {
        const st = sessionStatus(s, now);
        const c = COLORS[st];
        return (
          <div key={s.name} className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: st === 'Open' ? `0 0 9px ${c}` : 'none' }} />
            <span className="font-sora text-[12px] font-600 text-txt2">{s.name}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] tnum" style={{ color: c }}>{st}</span>
          </div>
        );
      })}
      <div className="ml-auto text-[11px] text-muted tnum tracking-wide">{now.toUTCString().slice(17, 25)} UTC</div>
    </div>
  );
}
