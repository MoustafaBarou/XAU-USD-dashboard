import type { MarketFeed, Tick, FeedStatus, TickCallback, StatusCallback } from './types';

/**
 * Mt5BridgeFeed — FUTURE provider scaffold for VT Markets MT5.
 *
 * GitHub Pages is static, so MT5 cannot be reached directly from the browser.
 * The intended topology is:
 *
 *    VT Markets  →  MT5 terminal  →  Feed Bridge (your host, e.g. a small
 *                                     WebSocket relay / EA exporter)  →  this class  →  Dashboard
 *
 * Point `wsUrl` at your bridge. It must push JSON ticks shaped like:
 *    { symbol, bid, ask, time }
 * On connection this feed forwards genuine broker bid/ask straight through —
 * at which point the UI's bid/ask/spread become true MT5 values automatically,
 * with no UI changes required.
 */
export class Mt5BridgeFeed implements MarketFeed {
  readonly name = 'VT Markets MT5 (bridge)';
  private ws: WebSocket | null = null;
  private tickCbs = new Set<TickCallback>();
  private statusCbs = new Set<StatusCallback>();
  private seq = 0;
  private wsUrl: string;

  constructor(wsUrl: string) { this.wsUrl = wsUrl; }

  connect() {
    this.emitStatus('connecting');
    try {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => this.emitStatus('connected');
      this.ws.onclose = () => this.emitStatus('disconnected');
      this.ws.onerror = () => this.emitStatus('error', 'bridge socket error');
      this.ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          const bid = Number(d.bid), ask = Number(d.ask);
          if (!isFinite(bid) || !isFinite(ask)) return;
          const tick: Tick = {
            symbol: d.symbol || 'XAU/USD',
            price: +((bid + ask) / 2).toFixed(2),
            bid, ask,
            time: d.time ? Number(d.time) : Date.now(),
            seq: ++this.seq,
          };
          this.tickCbs.forEach((cb) => cb(tick));
        } catch { /* ignore malformed frame */ }
      };
    } catch (e) {
      this.emitStatus('error', e instanceof Error ? e.message : 'connect failed');
    }
  }

  disconnect() { this.ws?.close(); this.ws = null; this.emitStatus('disconnected'); }
  subscribe(symbol: string) { this.ws?.readyState === 1 && this.ws.send(JSON.stringify({ action: 'sub', symbol })); }
  unsubscribe(symbol: string) { this.ws?.readyState === 1 && this.ws.send(JSON.stringify({ action: 'unsub', symbol })); }
  onTick(cb: TickCallback) { this.tickCbs.add(cb); return () => this.tickCbs.delete(cb); }
  onStatus(cb: StatusCallback) { this.statusCbs.add(cb); return () => this.statusCbs.delete(cb); }
  private emitStatus(s: FeedStatus, detail?: string) { this.statusCbs.forEach((cb) => cb(s, detail)); }
}
