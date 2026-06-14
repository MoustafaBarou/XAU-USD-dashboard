import { useEffect, useState } from 'react';

// Realtime countdown to a target UTC datetime, formatted HH:MM:SS.
// Renders "LIVE" once the event time has passed.
export function EventCountdown({ target, className }: { target: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = new Date(target).getTime();
  if (isNaN(t)) return <span className={`tnum ${className ?? ''}`}>--:--:--</span>;

  const diff = t - now;
  if (diff <= 0) {
    return <span className={className} style={{ color: '#FF4D6D' }}>LIVE</span>;
  }

  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x: number) => x.toString().padStart(2, '0');

  return <span className={`tnum ${className ?? ''}`}>{pad(h)}:{pad(m)}:{pad(s)}</span>;
}
