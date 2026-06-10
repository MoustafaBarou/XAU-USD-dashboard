import type { MarketFeed, Tick, FeedStatus, TickCallback, StatusCallback } from './types';

/**
 * GoldApiFeed — REAL spot data from gold-api.com.
 *  - Free, no API key, CORS-enabled, no rate limit on real-time prices.
 *  - Endpoint: GET https://api.gold-api.com/price/XAU  ->  { symbol, price, updatedAt }
 *
 * IMPORTANT (honest data policy):
 *  - This is a genuine external source. No prices are fabricated.
 *  - Spot REST refreshes every few seconds (not true tick-by-tick). We poll fast
 *    and only emit a tick when the real price actually changes.
 *  - The source provides a single spot value. Bid/Ask are presented as
 *    mid ± (displayedSpread / 2); the displayed spread is a UI convention until a
 *    broker (VT Markets MT5) feed supplies real bid/ask. This is labelled in the UI.
 *  - If the fetch fails, we emit 'error'/'disconnected' and STOP. No fallback prices.
 */
export class GoldApiFeed implements MarketFeed {
  readonly name = 'gold-api.com (XAU spot)';
  private url = 'https://api.gold-api.com/price/XAU';
  private pollMs = 2000;
  private timer: number | null = null;
  private tickCbs = new Set<TickCallback>();
  private statusCbs = new Set<StatusCallback>();
  private subscribed = new Set<string>();
  private seq = 0;
  private lastPrice: number | null = null;
  // displayed spread in USD (UI convention until broker bid/ask available)
  private displaySpread = 0.30;
  private consecutiveErrors = 0;

  connect() {
    this.emitStatus('connecting');
    this.poll();
    this.timer = window.setInterval(() => this.poll(), this.pollMs);
  }

  disconnect() {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.emitStatus('disconnected');
  }

  subscribe(symbol: string) { this.subscribed.add(symbol); }
  unsubscribe(symbol: string) { this.subscribed.delete(symbol); }

  onTick(cb: TickCallback) { this.tickCbs.add(cb); return () => this.tickCbs.delete(cb); }
  onStatus(cb: StatusCallback) { this.statusCbs.add(cb); return () => this.statusCbs.delete(cb); }

  private emitStatus(s: FeedStatus, detail?: string) {
    this.statusCbs.forEach((cb) => cb(s, detail));
  }

  private async poll() {
    try {
      const res = await fetch(this.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const price = Number(data?.price);
      if (!isFinite(price) || price <= 0) throw new Error('bad payload');

      this.consecutiveErrors = 0;
      this.emitStatus('connected');

      // Only emit when the real price actually changed -> genuine moves only.
      if (this.lastPrice === null || price !== this.lastPrice) {
        const t = data?.updatedAt ? Date.parse(data.updatedAt) : Date.now();
        const time = isFinite(t) ? t : Date.now();
        const tick: Tick = {
          symbol: 'XAU/USD',
          price,
          bid: +(price - this.displaySpread / 2).toFixed(2),
          ask: +(price + this.displaySpread / 2).toFixed(2),
          time,
          seq: ++this.seq,
        };
        this.lastPrice = price;
        this.tickCbs.forEach((cb) => cb(tick));
      }
    } catch (err) {
      this.consecutiveErrors++;
      // After repeated failures, declare the feed down. No fabricated data.
      if (this.consecutiveErrors >= 2) {
        this.emitStatus('error', err instanceof Error ? err.message : 'fetch failed');
      }
    }
  }
}
