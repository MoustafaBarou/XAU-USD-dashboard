// Time helpers for displaying economic-event times in Amsterdam local time.
// Europe/Amsterdam handles CET (winter) / CEST (summer) automatically.

const AMS_TZ = 'Europe/Amsterdam';

// Formats an ISO/UTC datetime as HH:MM in Amsterdam time.
export function fmtAmsTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: AMS_TZ });
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
