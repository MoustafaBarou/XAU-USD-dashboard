import { useEffect, useState, useCallback } from 'react';
import { fetchRetailSentiment, SENTIMENT_POLL_MS, type RetailSentiment } from '../services/sentimentService';

export type SentimentState =
  | { status: 'loading' }
  | { status: 'error'; reason: 'no-key' | 'error' | 'empty'; message: string }
  | { status: 'ok'; data: RetailSentiment };

/** Shared hook: fetches the XAU/USD retail outlook via the proxy, refreshes 60s. */
export function useRetailSentiment(): SentimentState & { reload: () => void } {
  const [state, setState] = useState<SentimentState>({ status: 'loading' });

  const load = useCallback(async () => {
    const r = await fetchRetailSentiment();
    if (r.ok) setState({ status: 'ok', data: r.data });
    else setState({ status: 'error', reason: r.reason, message: r.message });
  }, []);

  useEffect(() => {
    let alive = true;
    load();
    const id = setInterval(() => { if (alive) load(); }, SENTIMENT_POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [load]);

  return { ...state, reload: load };
}
