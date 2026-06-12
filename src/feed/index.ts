import type { MarketFeed } from './types';
import { GoldApiFeed } from './GoldApiFeed';
import { Mt5BridgeFeed } from './Mt5BridgeFeed';
import { TwelveDataFeed } from './TwelveDataFeed';

export type ProviderId = 'auto' | 'twelvedata' | 'gold-api' | 'mt5-bridge';

const TWELVEDATA_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY as string | undefined;

export function createFeed(provider: ProviderId = 'auto', opts?: { wsUrl?: string }): MarketFeed {
  switch (provider) {
    case 'mt5-bridge':
      return new Mt5BridgeFeed(opts?.wsUrl ?? 'wss://your-mt5-bridge.example/ws');
    case 'twelvedata':
      if (TWELVEDATA_KEY) return new TwelveDataFeed(TWELVEDATA_KEY);
      return new GoldApiFeed();
    case 'gold-api':
      return new GoldApiFeed();
    case 'auto':
    default:
      return TWELVEDATA_KEY ? new TwelveDataFeed(TWELVEDATA_KEY) : new GoldApiFeed();
  }
}

export function activeProviderLabel(): string {
  return TWELVEDATA_KEY ? 'Twelve Data WebSocket' : 'gold-api.com spot';
}

export * from './types';
