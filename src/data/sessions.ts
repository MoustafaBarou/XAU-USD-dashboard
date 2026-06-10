// Real market-session logic computed from the user's clock in UTC.
// Standard FX session windows (UTC). Status is computed, not faked.
export interface SessionDef { name: string; openUtc: number; closeUtc: number; }

export const SESSIONS: SessionDef[] = [
  { name: 'Sydney',   openUtc: 21, closeUtc: 6  },
  { name: 'Tokyo',    openUtc: 0,  closeUtc: 9  },
  { name: 'London',   openUtc: 7,  closeUtc: 16 },
  { name: 'New York', openUtc: 12, closeUtc: 21 },
];

export type SessionStatus = 'Open' | 'Closed' | 'Premarket' | 'After Hours';

export function sessionStatus(s: SessionDef, now: Date): SessionStatus {
  const day = now.getUTCDay(); // 0 Sun .. 6 Sat
  // FX closed over the weekend (Fri 21:00 UTC -> Sun 21:00 UTC approx)
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const weekendClosed =
    day === 6 || (day === 0 && h < 21) || (day === 5 && h >= 21);
  if (weekendClosed) return 'Closed';

  const inWindow = (open: number, close: number) =>
    open < close ? h >= open && h < close : h >= open || h < close;

  if (inWindow(s.openUtc, s.closeUtc)) return 'Open';

  // within 1h before open -> premarket; within 1h after close -> after hours
  const preOpen = (s.openUtc - 1 + 24) % 24;
  if (inWindow(preOpen, s.openUtc)) return 'Premarket';
  const postClose = (s.closeUtc + 1) % 24;
  if (inWindow(s.closeUtc, postClose)) return 'After Hours';

  return 'Closed';
}

/** Minutes until the session next changes state, with a label. */
export function sessionCountdown(s: SessionDef, now: Date): { label: string; text: string } {
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const st = sessionStatus(s, now);
  const inWindow = (open: number, close: number) =>
    open < close ? h >= open && h < close : h >= open || h < close;

  const hoursUntil = (target: number) => {
    let d = target - h;
    if (d <= 0) d += 24;
    return d;
  };
  const fmt = (hrs: number) => {
    const total = Math.round(hrs * 60);
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
  };

  if (st === 'Open') return { label: 'closes in', text: fmt(hoursUntil(s.closeUtc)) };
  if (inWindow((s.openUtc - 1 + 24) % 24, s.openUtc)) return { label: 'opens in', text: fmt(hoursUntil(s.openUtc)) };
  return { label: 'opens in', text: fmt(hoursUntil(s.openUtc)) };
}
