/**
 * SymbolBadge — institutional instrument tag (XAUUSD, DXY, VIX, EURUSD, GBPUSD…).
 *
 * No emoji, no flags: a restrained status dot + a tracked, tabular ticker token,
 * the way a professional terminal labels an instrument. The status dot reflects
 * the feed state — live (green), unavailable (red), or idle/no-feed (grey).
 */
export type FeedStatus = 'live' | 'unavailable' | 'idle';

const DOT: Record<FeedStatus, { bg: string; glow: boolean }> = {
  live: { bg: '#4ADE80', glow: true },
  unavailable: { bg: '#FF4D6D', glow: false },
  idle: { bg: '#3A4250', glow: false },
};

/** XAU is the desk's hero instrument, so it carries the gold accent; the rest
 *  stay neutral to keep the tape calm and institutional. */
function tokenColor(symbol: string): string {
  return symbol === 'XAUUSD' ? '#E6C65B' : '#C5CCD8';
}

export function SymbolBadge({
  symbol,
  status = 'idle',
  showDot = true,
  className = '',
}: {
  symbol: string;
  status?: FeedStatus;
  showDot?: boolean;
  className?: string;
}) {
  const dot = DOT[status];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${status === 'live' ? 'animate-pulse' : ''}`}
          style={{ background: dot.bg, boxShadow: dot.glow ? `0 0 7px ${dot.bg}` : 'none' }}
        />
      )}
      <span
        className="font-sora font-700 text-[11px] tracking-ticker tnum"
        style={{ color: tokenColor(symbol) }}
      >
        {symbol}
      </span>
    </span>
  );
}
