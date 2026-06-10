import { useEffect, useRef } from 'react';
import { Eyebrow } from './ui';

/**
 * First-class TradingView chart. Rendered as a large near-full-bleed surface,
 * not a small embedded card — it carries 50-60% of the workspace.
 */
export function Chart({ height = 560 }: { height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbol: 'OANDA:XAUUSD', interval: '60', timezone: 'Etc/UTC', theme: 'dark', style: '1',
      locale: 'en', autosize: true, hide_side_toolbar: false, allow_symbol_change: false,
      withdateranges: true, details: false, calendar: false,
      backgroundColor: 'rgba(8,11,16,0)', gridColor: 'rgba(255,255,255,0.035)',
    });
    ref.current.appendChild(s);
  }, []);
  return (
    <div className="surface surface-lit p-2.5 h-full flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">XAU / USD · Live Chart</h3>
        <Eyebrow>TradingView</Eyebrow>
      </div>
      <div ref={ref} className="rounded-2xl overflow-hidden flex-1" style={{ minHeight: height }} />
    </div>
  );
}
