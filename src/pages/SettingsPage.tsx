import { PagePlaceholder } from './PageShell';

export function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      description="Configure data sources, display preferences and the upcoming VT Markets MT5 bridge connection."
      features={[
        { label: 'Data Source', note: 'Switch between gold-api.com spot and a live broker feed via the feed abstraction layer.' },
        { label: 'VT Markets MT5 Bridge', note: 'Enter your bridge WebSocket URL to stream true tick-level bid/ask.' },
        { label: 'Display Preferences', note: 'Decimal precision, spread display, and reduced-motion options.' },
        { label: 'Alerts', note: 'Price and bias-change notifications, configurable per threshold.' },
      ]}
    />
  );
}
