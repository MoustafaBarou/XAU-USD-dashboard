// ── Feed abstraction layer ───────────────────────────────────────────────
// The UI depends ONLY on these interfaces, never on a concrete provider.
// Swap in VT Markets MT5 / TradingView / custom WS by implementing MarketFeed.

export interface Tick {
  symbol: string;
  /** mid / last traded price */
  price: number;
  bid: number;
  ask: number;
  /** ms epoch of this tick */
  time: number;
  /** monotonically increasing tick counter from the feed */
  seq: number;
}

export type FeedStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type TickCallback = (tick: Tick) => void;
export type StatusCallback = (status: FeedStatus, detail?: string) => void;

export interface MarketFeed {
  readonly name: string;
  connect(): void;
  disconnect(): void;
  subscribe(symbol: string): void;
  unsubscribe(symbol: string): void;
  onTick(cb: TickCallback): () => void;
  onStatus(cb: StatusCallback): () => void;
}
