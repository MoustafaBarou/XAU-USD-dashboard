import { useEffect, useRef } from 'react';
import { Eyebrow } from './ui';

/**
 * First-class TradingView chart.
 * We give the widget an explicit pixel height (not autosize) and force the
 * injected iframe to fill its container, so it renders full-size instead of a
 * thin strip.
 */
export function Chart({ height = 560 }: { height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = '';

    // TradingView expects this exact wrapper structure.
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container';
    widget.style.height = '100%';
    widget.style.width = '100%';

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.height = '100%';
    inner.style.width = '100%';
    widget.appendChild(inner);

    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.type = 'text/javascript';
    s.async = true;
    s.innerHTML = JSON.stringify({
      autosize: true,
      symbol: 'OANDA:XAUUSD',
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      hide_side_toolbar: false,
      allow_symbol_change: false,
      withdateranges: true,
      details: false,
      calendar: false,
      backgroundColor: 'rgba(8,11,16,0)',
      gridColor: 'rgba(255,255,255,0.035)',
      support_host: 'https://www.tradingview.com',
    });
    widget.appendChild(s);
    host.appendChild(widget);
  }, []);

  return (
    <div className="surface surface-lit p-2.5 flex flex-col" style={{ height: height + 56 }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-3 shrink-0">
        <h3 className="font-sora text-[13px] font-700 tracking-[0.16em] uppercase text-txt">XAU / USD · Live Chart</h3>
        <Eyebrow>TradingView</Eyebrow>
      </div>
      {/* explicit height so the iframe has a real box to fill */}
      <div
        ref={ref}
        className="rounded-2xl overflow-hidden flex-1 [&_iframe]:!h-full [&_iframe]:!w-full"
        style={{ height }}
      />
    </div>
  );
}
