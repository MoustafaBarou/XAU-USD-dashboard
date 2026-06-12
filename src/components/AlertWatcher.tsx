import { useEffect, useRef } from 'react';
import type { GoldState } from '../hooks/useGoldFeed';
import { usePreferences } from '../lib/PreferencesContext';
import { useToast } from './Toasts';
import { goldMomentumDriver } from '../lib/macroBias';

// ── In-app alert engine ───────────────────────────────────────────────────
// Watches the live gold price + directional bias and fires in-app toasts when
// the user's thresholds are crossed. Client-side only: works while the app is
// open in this tab. Renders nothing.

export function AlertWatcher({ g }: { g: GoldState }) {
  const { prefs } = usePreferences();
  const { push } = useToast();

  // Armed flags so an alert fires once per crossing, not every tick.
  const aboveArmed = useRef(true);
  const belowArmed = useRef(true);
  const lastBias = useRef<string | null>(null);

  // Price-threshold alerts.
  useEffect(() => {
    if (!prefs.priceAlertEnabled || g.price === null) return;
    const price = g.price;

    if (prefs.priceAlertAbove !== null) {
      if (price >= prefs.priceAlertAbove && aboveArmed.current) {
        aboveArmed.current = false;
        push({ tone: 'up', title: `XAU/USD ${price.toFixed(2)} ≥ ${prefs.priceAlertAbove}`, body: 'Upper price alert triggered.' });
      } else if (price < prefs.priceAlertAbove) {
        aboveArmed.current = true; // re-arm once back below
      }
    }
    if (prefs.priceAlertBelow !== null) {
      if (price <= prefs.priceAlertBelow && belowArmed.current) {
        belowArmed.current = false;
        push({ tone: 'down', title: `XAU/USD ${price.toFixed(2)} ≤ ${prefs.priceAlertBelow}`, body: 'Lower price alert triggered.' });
      } else if (price > prefs.priceAlertBelow) {
        belowArmed.current = true;
      }
    }
  }, [g.price, prefs.priceAlertEnabled, prefs.priceAlertAbove, prefs.priceAlertBelow, push]);

  // Bias-change alerts (directional bias from the live gold momentum driver).
  useEffect(() => {
    if (!prefs.biasAlertEnabled) { lastBias.current = null; return; }
    const connected = g.status === 'connected';
    const driver = goldMomentumDriver(g.price, g.dayOpen, connected);
    if (!driver.available) return;
    const bias = driver.bias;
    if (lastBias.current === null) { lastBias.current = bias; return; } // baseline, no alert
    if (bias !== lastBias.current) {
      const tone = bias.includes('Bullish') ? 'up' : bias.includes('Bearish') ? 'down' : 'neutral';
      push({ tone, title: `Bias changed → ${bias}`, body: `${driver.headline} · ${driver.title}` });
      lastBias.current = bias;
    }
  }, [g.price, g.dayOpen, g.status, prefs.biasAlertEnabled, push]);

  return null;
}
