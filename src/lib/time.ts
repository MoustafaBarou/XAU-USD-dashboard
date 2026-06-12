// Time helpers for displaying economic-event times in Amsterdam local time.
// Europe/Amsterdam handles CET (winter) / CEST (summer) automatically.

const AMS_TZ = 'Europe/Amsterdam';

// JBlanked returns event times as Amsterdam wall-clock time (matching
// ForexFactory's Amsterdam display), formatted "2024.02.08 15:30:00".
// We must convert that wall-clock time to a true UTC instant so countdowns,
// sorting and day-filtering are correct, then display it back in Amsterdam time.
//
// Returns an ISO UTC string, or '' if unparseable.
export function parseJbDateAms(s: unknown): string {
  const str = String(s ?? '');
  const m = str.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return '';
  const [, ys, mos, ds, hs, mis, ss] = m;
  const y = +ys, mo = +mos, d = +ds, h = +hs, mi = +mis, sec = ss ? +ss : 0;
  // Offset (minutes) that Amsterdam is ahead of UTC for this wall-clock date.
  const naiveUTC = Date.UTC(y, mo - 1, d, h, mi, sec);
  const ams = new Date(new Date(naiveUTC).toLocaleString('en-US', { timeZone: AMS_TZ }));
  const utc = new Date(new Date(naiveUTC).toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMin = Math.round((ams.getTime() - utc.getTime()) / 60000);
  // True UTC instant = wall-clock interpreted at Amsterdam minus the offset.
  const trueUTC = naiveUTC - offsetMin * 60000;
  const out = new Date(trueUTC);
  return isNaN(out.getTime()) ? '' : out.toISOString();
}

// Formats an ISO/UTC datetime as HH:MM in Amsterdam time.
export function fmtAmsTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: AMS_TZ });
}

// Amsterdam wall-clock hour-of-day (0–24 float) for a given instant. DST-aware.
export function amsHoursOfDay(d: Date): number {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: AMS_TZ, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => +(p.find((x) => x.type === t)?.value ?? '0');
  return (get('hour') % 24) + get('minute') / 60 + get('second') / 3600;
}

// Hours Amsterdam is ahead of UTC at the given instant (+1 CET, +2 CEST).
export function amsUtcOffsetHours(d: Date): number {
  const ams = new Date(d.toLocaleString('en-US', { timeZone: AMS_TZ }));
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((ams.getTime() - utc.getTime()) / 3600000);
}

// Amsterdam calendar day (YYYY-MM-DD) for a given instant.
export function amsDateKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: AMS_TZ });
}

// Returns the correct short zone label for a given date: 'CET' or 'CEST'.
export function amsZoneLabel(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return 'CET';
  const tzName = new Intl.DateTimeFormat('en-GB', {
    timeZone: AMS_TZ, timeZoneName: 'short', hour: '2-digit',
  }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? '';
  if (tzName.includes('2')) return 'CEST';
  if (tzName.includes('1')) return 'CET';
  if (tzName === 'CET' || tzName === 'CEST') return tzName;
  return 'CET';
}
