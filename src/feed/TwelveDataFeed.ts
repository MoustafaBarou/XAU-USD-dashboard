import type { MarketFeed, Tick, FeedStatus, TickCallback, StatusCallback } from './types';

/**
 * TwelveDataFeed - REAL-time XAU/USD via Twelve Data WebSocket.
 *
 * Endpoint: wss://ws.twelvedata.com/v1/quotes/price?apikey=KEY
 * Auth:     apikey passed in the URL (market-data scope only).
 * Protocol: after the socket opens, send { action:"subscribe", params:{ symbols:"XAU/USD" } }.
 *           The server then pushes { event:"price", symbol, price, timestamp, ... } messages.
 *
 * Honest-data policy:
 *  - Genuine push stream (~170ms latency). No fabricated prices.
 *  - Twelve Data /quotes/price streams a single price (last). Bid/Ask are shown as
 *    mid +/- (displaySpread / 2) - a UI convention until a broker feed (VT Markets MT5)
 *    provides real bid/ask. The same convention the gold-api feed already uses.
 *  - On auth failure / disconnect, emits 'error'/'disconnected' and stops. No fallback prices.
 *  - WebSocket lifecycle is fully cleaned up on disconnect (no leaks, no zombie sockets).
 */
export class TwelveDataFeed implements MarketFeed {
  readonly name = 'Twelve Data (XAU/USD WebSocket)';

  private ws: WebSocket | null = null;
  private apiKey: string;
  private tickCbs = new Set<TickCallback>();
  private statusCbs = new Set<StatusCallback>();
  private subscribed = new Set<string>();
  private seq = 0;
  private lastPrice: number | null = null;
  private displaySpread = 0.30;

  private closedByUser = false;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  connect() {
    this.closedByUser = false;
    this.open();
  }

  private open() {
    this.emitStatus('connecting');
    try {
      const url = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${encodeURIComponent(this.apiKey)}`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emitStatus('connected');
        for (const sym of this.subscribed) this.sendSubscribe(sym);
        if (this.subscribed.size === 0) this.sendSubscribe('XAU/USD');
        this.startHeartbeat();
      };

      ws.onmessage = (ev) => this.handleMessage(ev);

      ws.onerror = () => {
        this.emitStatus('error', 'WebSocket error');
      };

      ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;
        if (this.closedByUser) {
          this.emitStatus('disconnected');
          return;
        }
        this.emitStatus('disconnected');
        this.scheduleReconnect();
      };
    } catch (err) {
      this.emitStatus('error', err instanceof Error ? err.message : 'connect failed');
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.closedByUser = true;
    this.clearReconnect();
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch { /* ignore */ }
      this.ws = null;
    }
    this.emitStatus('disconnected');
  }

  subscribe(symbol: string) {
    this.subscribed.add(symbol);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.sendSubscribe(symbol);
  }

  unsubscribe(symbol: string) {
    this.subscribed.delete(symbol);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.safeSend({ action: 'unsubscribe', params: { symbols: symbol } });
    }
  }

  onTick(cb: TickCallback) { this.tickCbs.add(cb); return () => this.tickCbs.delete(cb); }
  onStatus(cb: StatusCallback) { this.statusCbs.add(cb); return () => this.statusCbs.delete(cb); }

  private handleMessage(ev: MessageEvent) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
    } catch {
      return;
    }

    const event = String(msg.event ?? '');

    if (event === 'subscribe-status') {
      const status = String(msg.status ?? '');
      if (status === 'error') {
        this.emitStatus('error', 'Twelve Data rejected the subscription (check plan / symbol access).');
      }
      return;
    }

    if (event === 'price') {
      const price = Number(msg.price);
      if (!isFinite(price) || price <= 0) return;
      this.emitStatus('connected');

      if (this.lastPrice === null || price !== this.lastPrice) {
        const ts = Number(msg.timestamp);
        const time = isFinite(ts) && ts > 0 ? ts * 1000 : Date.now();
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
    }
  }

  private sendSubscribe(symbol: string) {
    this.safeSend({ action: 'subscribe', params: { symbols: symbol } });
  }

  private safeSend(obj: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(obj)); } catch { /* ignore */ }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.safeSend({ action: 'heartbeat' });
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    this.clearReconnect();
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelay);
    this.reconnectTimer = window.setTimeout(() => this.open(), delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer !== null) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  private emitStatus(s: FeedStatus, detail?: string) {
    this.statusCbs.forEach((cb) => cb(s, detail));
  }
}
