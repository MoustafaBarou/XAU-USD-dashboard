import type { MarketFeed } from './types';
import { GoldApiFeed } from './GoldApiFeed';
import { Mt5BridgeFeed } from './Mt5BridgeFeed';

export type ProviderId = 'gold-api' | 'mt5-bridge';

/**
 * Feed selector. The UI calls createFeed() and never imports a concrete class.
 * To go live on VT Markets MT5 later: set provider to 'mt5-bridge' and pass your
 * bridge WebSocket URL. Nothing in the UI layer changes.
 */
export function createFeed(provider: ProviderId = 'gold-api', opts?: { wsUrl?: string }): MarketFeed {
  switch (provider) {
    case 'mt5-bridge':
      return new Mt5BridgeFeed(opts?.wsUrl ?? 'wss://your-mt5-bridge.example/ws');
    case 'gold-api':
    default:
      return new GoldApiFeed();
  }
}

export * from './types';
